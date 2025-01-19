import { OrderParamsV5, PositionInfoParamsV5, PositionV5 } from "bybit-api";
import { restClient } from "../service/bybitClient";
import { CandleType } from "../service/types";
import TimeFrameRepo from "./timeFrameRepo";
import { walletLiveInstance } from "./instances";
import { countDecimalDigits } from "../service/misc";

class PairRepo {
  #pair: string = "";
  #timeFrames: Map<string, TimeFrameRepo> = new Map<string, TimeFrameRepo>();
  #strategy: string = "";
  #baseCoin: string = "";
  #quotationCoin: string = "";
  #isFuture: boolean = false;
  #invert: boolean = false;
  #risk: number = 0.1;

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
    risk: number
  ) {
    this.#pair = pair;
    this.#strategy = strategy;
    this.#baseCoin = baseCoin;
    this.#quotationCoin = quotationCoin;
    this.#isFuture = isFuture;
    this.#invert = invert;
    this.#risk = risk;

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

  get risk() {
    return this.#risk;
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

  //Create a spot buy order
  async postBuyOrder(
    price: number,
    percentage: number = 1
  ): Promise<boolean | void> {
    if (!this.#invert)
      return await this.#postOrder(
        price,
        percentage,
        walletLiveInstance.getCoinAmount(this.#quotationCoin) || 0,
        price,
        "Buy"
      );
    else
      return await this.#postOrder(
        price,
        percentage,
        walletLiveInstance.getCoinAmount(this.#baseCoin) || 0,
        1,
        "Sell"
      );
  }

  //Create a spot sell order
  async postSellOrder(
    price: number,
    percentage: number = 1
  ): Promise<boolean | void> {
    if (!this.#invert)
      return await this.#postOrder(
        price,
        percentage,
        walletLiveInstance.getCoinAmount(this.#baseCoin) || 0,
        1,
        "Sell"
      );
    else
      return await this.#postOrder(
        price,
        percentage,
        walletLiveInstance.getCoinAmount(this.#quotationCoin) || 0,
        price,
        "Buy"
      );
  }

  async #postOrder(
    price: number,
    percentage: number,
    coinBalance: number,
    coinUnitPrice: number,
    side: "Buy" | "Sell"
  ): Promise<boolean | void> {
    await this.#initPairInfo();
    await this.#cancelOrders();
    await walletLiveInstance.init();

    let fullQty = 0;

    if (!this.#isFuture) {
      const balance = coinBalance;
      fullQty = balance / coinUnitPrice;
    } else {
      const balance = walletLiveInstance.margin;
      fullQty = balance / price;
    }

    let qty = fullQty * percentage;

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
    };

    const response = await restClient
      .submitOrder(request)
      .then((r) => {
        if (r.retCode > 0) console.warn(r.retCode + " - " + r.retMsg);
        return r.retCode === 0;
      })
      .catch((e) => {
        console.warn(e);
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
        .then((r) => {
          if (r.retCode > 0) console.warn(r.retCode + " - " + r.retMsg);
          return r.retCode === 0;
        })
        .catch((e) => {
          console.warn(e);
        });
    }
  }
}

export default PairRepo;
