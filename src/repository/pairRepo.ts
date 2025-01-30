import { OrderParamsV5, PositionInfoParamsV5, PositionV5 } from "bybit-api";
import { restClient } from "../service/bybitClient";
import { CandleType, RiskMethodType } from "../service/types";
import TimeFrameRepo from "./timeFrameRepo";
import { positionsLiveInstance, walletLiveInstance } from "./instances";
import { countDecimalDigits, getRoadToMillionRisk } from "../service/misc";

//Pair memory cache
class PairRepo {
  #pair: string = "";
  #timeFrames: Map<string, TimeFrameRepo> = new Map<string, TimeFrameRepo>();
  #strategy: string = "";
  #baseCoin: string = "";
  #quotationCoin: string = "";
  #isFuture: boolean = false;
  #invert: boolean = false;
  #riskAmount: number = 0.1;
  #riskMethod: RiskMethodType = "percentOfEquity";

  #takerRate: number = 0;
  #makerRate: number = 0;
  #qtyDigits: number = 0;
  #priceDigits: number = 0;
  #maxQty: number = 0;
  #minQty: number = 0;
  #precision: number = 0;

  constructor(
    pair: string,
    timeFrames: string[],
    strategy: string,
    baseCoin: string,
    quotationCoin: string,
    isFuture: boolean,
    invert: boolean,
    riskAmount: number,
    riskMethod: RiskMethodType
  ) {
    this.#pair = pair;
    this.#strategy = strategy;
    this.#baseCoin = baseCoin;
    this.#quotationCoin = quotationCoin;
    this.#isFuture = isFuture;
    this.#invert = invert;
    this.#riskAmount = riskAmount;
    this.#riskMethod = riskMethod;

    for (let timeframe of timeFrames) {
      this.#timeFrames.set(
        timeframe.toString().toLocaleLowerCase(),
        new TimeFrameRepo()
      );
    }
  }

  async init() {
    this.#timeFrames.forEach(async (value, key) => {
      await value.init(this.#pair, key, this.#isFuture);
    });
  }

  get pair() {
    return this.#pair;
  }

  get strategy() {
    return this.#strategy;
  }

  get baseCoin() {
    return this.#baseCoin;
  }

  get quotationCoin() {
    return this.#quotationCoin;
  }

  get isFuture() {
    return this.#isFuture;
  }

  get invert() {
    return this.#invert;
  }

  get riskAmount() {
    return this.#riskAmount;
  }

  get riskMethod() {
    return this.#riskMethod;
  }

  getTimeFrame(timeFrame: string) {
    return this.#timeFrames.get(timeFrame.toString().toLocaleLowerCase());
  }

  get timeFrames(): string[] {
    return Array.from(this.#timeFrames.keys());
  }

  addCandle(timeFrame: string, candle: CandleType) {
    const timeFrameKey = timeFrame.toString().toLocaleLowerCase();
    if (this.#timeFrames.has(timeFrameKey))
      this.#timeFrames.get(timeFrameKey)?.addCandle(candle);
  }

  cleanup() {
    this.#timeFrames.forEach((value, key) => value.cleanup());
  }

  async #initPairInfo() {
    if (this.#maxQty > 0) return;
    if (this.#isFuture) this.#initFuturePairInfo();
    else this.#initSpotPairInfo();
  }

  async #initSpotPairInfo() {
    await restClient
      .getFeeRate({
        category: "spot",
        symbol: this.#pair,
      })
      .then((r) => {
        if (r.retCode > 0) console.warn(r.retCode + " - " + r.retMsg);
        const feesRec = (r.result.list && r.result.list[0]) || undefined;

        if (!feesRec) return 0;

        this.#makerRate = parseFloat(feesRec.makerFeeRate);
        this.#takerRate = parseFloat(feesRec.takerFeeRate);
      })
      .catch((e) => {
        console.warn(e);
      });

    await restClient
      .getInstrumentsInfo({
        category: "spot",
        symbol: this.pair,
      })
      .then((r) => {
        if (r.retCode > 0) console.warn(r.retCode + " - " + r.retMsg);
        if (r.result.list.length > 0) {
          const symboleInfo = r.result.list[0];

          this.#precision = parseFloat(
            symboleInfo?.lotSizeFilter?.basePrecision
          );
          this.#qtyDigits = countDecimalDigits(
            symboleInfo?.lotSizeFilter?.basePrecision
          );
          this.#maxQty = parseFloat(symboleInfo?.lotSizeFilter.maxOrderQty);
          this.#minQty = parseFloat(symboleInfo?.lotSizeFilter.minOrderQty);
          this.#priceDigits = countDecimalDigits(
            symboleInfo?.priceFilter?.tickSize
          );
        }
      })
      .catch((e) => {
        console.warn(e);
      });
  }

  async #initFuturePairInfo() {
    //Disable hedging
    await restClient.switchPositionMode({
      category: "linear",
      symbol: this.#pair,
      mode: 0,
    });

    await restClient
      .getInstrumentsInfo({
        category: "linear",
        symbol: this.pair,
      })
      .then((r) => {
        if (r.retCode > 0) console.warn(r.retCode + " - " + r.retMsg);
        if (r.result.list.length > 0) {
          const symboleInfo = r.result.list[0];
          this.#precision = parseFloat(symboleInfo?.lotSizeFilter?.qtyStep);
          this.#qtyDigits = countDecimalDigits(
            symboleInfo?.lotSizeFilter?.qtyStep
          );
          this.#maxQty = parseFloat(symboleInfo?.lotSizeFilter.maxOrderQty);
          this.#minQty = parseFloat(symboleInfo?.lotSizeFilter.minOrderQty);
          this.#priceDigits = countDecimalDigits(
            symboleInfo?.priceFilter?.tickSize
          );
        }
      })
      .catch((e) => {
        console.warn(e);
      });
  }

  async #cancelOrders(): Promise<boolean | void> {
    const response = await restClient
      .cancelAllOrders({
        category: !this.#isFuture ? "spot" : "linear",
        symbol: this.#pair,
      })
      .then((r) => {
        if (r.retCode > 0) console.warn(r.retCode + " - " + r.retMsg);
        return r.retCode === 0;
      })
      .catch((e) => {
        console.warn(e);
      });

    return response;
  }

  #invertTPSL(
    price: number,
    takeProfit: number | undefined,
    stopLoss: number | undefined
  ):
    | {
        price: number;
        takeProfit: number | undefined;
        stopLoss: number | undefined;
      }
    | undefined {
    if (!this.#invert) return { price, takeProfit, stopLoss };
    else {
      if (!takeProfit || !stopLoss) return;

      if (takeProfit > price && price > stopLoss) {
        //Buy

        const slPoints = takeProfit - price;
        const invertedStopLoss = price + slPoints;

        const tpPoints = price - stopLoss;
        const invertedTakePorfit = price - tpPoints;

        return {
          price,
          takeProfit: invertedTakePorfit,
          stopLoss: invertedStopLoss,
        };
      } else if (stopLoss > price && price > takeProfit) {
        //Sell
        const slPoints = price - takeProfit;
        const invertedStopLoss = price - slPoints;

        const tpPoints = stopLoss - price;
        const invertedTakePorfit = price + tpPoints;
        return {
          price,
          takeProfit: invertedTakePorfit,
          stopLoss: invertedStopLoss,
        };
      }
    }
  }
  //Create a spot buy order
  async postBuyOrder(
    price: number,
    takeProfit: number | undefined = undefined,
    stopLoss: number | undefined = undefined
  ): Promise<boolean | void> {
    if (!this.#invert)
      return await this.#postOrder(
        price,
        walletLiveInstance.getCoinAmount(this.#quotationCoin) || 0,
        price,
        "Buy",
        takeProfit,
        stopLoss
      );
    else {
      const invertedPrices = this.#invertTPSL(price, takeProfit, stopLoss);

      return await this.#postOrder(
        price,
        walletLiveInstance.getCoinAmount(this.#baseCoin) || 0,
        1,
        "Sell",
        invertedPrices?.takeProfit || undefined,
        invertedPrices?.stopLoss || undefined
      );
    }
  }

  //Create a spot sell order
  async postSellOrder(
    price: number,
    takeProfit: number | undefined = undefined,
    stopLoss: number | undefined = undefined
  ): Promise<boolean | void> {
    if (!this.#invert)
      return await this.#postOrder(
        price,
        walletLiveInstance.getCoinAmount(this.#baseCoin) || 0,
        1,
        "Sell",
        takeProfit,
        stopLoss
      );
    else {
      const invertedPrices = this.#invertTPSL(price, takeProfit, stopLoss);

      return await this.#postOrder(
        price,
        walletLiveInstance.getCoinAmount(this.#quotationCoin) || 0,
        price,
        "Buy",
        invertedPrices?.takeProfit || undefined,
        invertedPrices?.stopLoss || undefined
      );
    }
  }

  async #postOrder(
    price: number,
    coinBalance: number,
    coinUnitPrice: number,
    side: "Buy" | "Sell",
    takeProfit: number | undefined = undefined,
    stopLoss: number | undefined = undefined
  ): Promise<boolean | void> {
    await this.#initPairInfo();
    await this.#cancelOrders();
    await walletLiveInstance.init();
    let qty = 0;

    if (!this.#isFuture) {
      const balance = coinBalance;
      let fullQty = balance / coinUnitPrice;
      qty = fullQty * this.riskAmount;
    } else {
      if (price && stopLoss) qty = this.#getFutureRiskQty(price, stopLoss);
      else if (price && takeProfit)
        qty = this.#getFutureRiskQty(price, takeProfit);
      else {
        //No stop loss
        const balance = walletLiveInstance.margin;
        let fullQty = balance / price;
        qty = fullQty * this.riskAmount;
      }
    }

    const rate = price > 0 ? this.#makerRate : this.#takerRate;
    qty = qty - qty * rate;

    if (this.#precision && this.#precision !== 0)
      qty = Math.floor(qty / this.#precision) * this.#precision;

    if (qty > this.#maxQty) qty = this.#maxQty;

    if (qty < this.#minQty) {
      console.warn("Insufficient balance");
      return false;
    }

    const request: OrderParamsV5 = {
      category: !this.#isFuture ? "spot" : "linear",
      symbol: this.#pair,
      orderType: price > 0 ? "Limit" : "Market",
      price: price > 0 ? price.toFixed(this.#priceDigits) : undefined,
      qty: qty.toFixed(this.#qtyDigits),
      side: side as "Buy" | "Sell",
      timeInForce: "GTC",
      tpslMode: "Full",
    };

    if (takeProfit) {
      request.takeProfit = takeProfit.toFixed(this.#priceDigits);
      request.tpOrderType = "Market";
    }

    if (stopLoss) {
      request.stopLoss = stopLoss.toFixed(this.#priceDigits);
      request.slLimitPrice = request.stopLoss;
      request.slOrderType = "Limit";
      request.tpslMode = "Partial"; // Required for limit type
    }

    const response = await restClient
      .submitOrder(request)
      .then(async (r) => {
        if (r.retCode > 0) console.warn(r.retCode + " - " + r.retMsg, request);
        await positionsLiveInstance.refresh();
        return r.retCode === 0;
      })
      .catch((e) => {
        console.warn(e, request);
      });

    return response;
  }

  async #getOpenFuturePositions(): Promise<PositionV5[] | void> {
    const request: PositionInfoParamsV5 = {
      category: "linear",
      symbol: this.#pair,
    };

    const response = await restClient
      .getPositionInfo(request)
      .then((r) => {
        if (r.retCode > 0) console.warn(r.retCode + " - " + r.retMsg);
        return r.result.list;
      })
      .catch((e) => {
        console.warn(e);
      });

    return response;
  }

  async closeOpenFuturePositions(
    price: number = 0,
    closeSell = true,
    closeBuy = true
  ) {
    if (!this.#invert) {
      return await this.#internalCloseOpenFuturePositions(
        price,
        closeSell,
        closeBuy
      );
    } else {
      return await this.#internalCloseOpenFuturePositions(
        price,
        closeBuy,
        closeSell
      );
    }
  }

  async #internalCloseOpenFuturePositions(
    price: number = 0,
    closeSell = true,
    closeBuy = true
  ) {
    await this.#initPairInfo();
    await this.#cancelOrders();
    const positions = await this.#getOpenFuturePositions();

    if (!positions) return;

    for (const postion of positions) {
      if (postion.side !== "Sell" && postion.side !== "Buy") continue;
      if (!closeSell && postion.side === "Sell") continue;
      if (!closeBuy && postion.side === "Buy") continue;

      const request: OrderParamsV5 = {
        category: "linear",
        symbol: postion.symbol,
        orderType: price > 0 ? "Limit" : "Market",
        price: price > 0 ? price.toFixed(this.#priceDigits) : undefined,
        qty: postion.size,
        side: postion.side === "Buy" ? "Sell" : "Buy",
        timeInForce: "GTC",
        reduceOnly: true,
      };

      await restClient
        .submitOrder(request)
        .then(async (r) => {
          if (r.retCode > 0)
            console.warn(r.retCode + " - " + r.retMsg, request);
          await positionsLiveInstance.refresh();
          return r.retCode === 0;
        })
        .catch((e) => {
          console.warn(e);
        });
    }
  }

  #getFutureRiskQty(entryPrice: number, stopLossPrice: number | undefined) {
    if (this.#riskMethod === "fixedQty") return this.#riskAmount;
    if (stopLossPrice === undefined) return 0;

    const balance = walletLiveInstance.margin;
    let amount = 0;

    if (this.#riskMethod === "percentOfEquity") {
      amount = balance * this.#riskAmount;
    } else if (this.#riskMethod === "fixedAmount") {
      amount = this.#riskAmount;
    } else if (this.#riskMethod === "roadToMillion") {
      amount = getRoadToMillionRisk(balance);
    }

    const riskPerOne = Math.abs(entryPrice - stopLossPrice);
    let qty = amount / riskPerOne;

    if (this.#precision && this.#precision !== 0)
      qty = Math.floor(qty / this.#precision) * this.#precision;

    if (qty > this.#maxQty) qty = this.#maxQty;

    return qty;
  }

  hasOpenSellPosition(): boolean {
    if (!this.#invert)
      return positionsLiveInstance.hasOpenSellPosition(this.#pair);
    else return positionsLiveInstance.hasOpenBuyPosition(this.#pair);
  }

  hasOpenBuyPosition(): boolean {
    if (!this.#invert)
      return positionsLiveInstance.hasOpenBuyPosition(this.#pair);
    else return positionsLiveInstance.hasOpenSellPosition(this.#pair);
  }
}

export default PairRepo;
