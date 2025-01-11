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
    isFuture: boolean
  ) {
    this.#pair = pair;
    this.#strategy = strategy;
    this.#baseCoin = baseCoin;
    this.#quotationCoin = quotationCoin;
    this.#isFuture = isFuture;

    for (let timeframe of timeFrames) {
      this.#timeFrames.set(timeframe, new TimeFrameRepo());
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

  getTimeFrame(timeFrame: string) {
    return this.#timeFrames.get(timeFrame);
  }

  get timeFrames(): string[] {
    return Array.from(this.#timeFrames.keys());
  }

  addCandle(timeFrame: string, candle: CandleType) {
    if (this.#timeFrames.has(timeFrame))
      this.#timeFrames.get(timeFrame)?.addCandle(candle);
  }

  cleanup() {
    this.#timeFrames.forEach((value, key) => value.cleanup());
  }

  async initPairInfo() {
    if (this.#maxQty > 0) return;

    await restClient
      .getFeeRate({
        category: !this.#isFuture ? "spot" : "linear",
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
        //category: !this.#isFuture ? "spot" : "linear",
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

  async cancelOrders(): Promise<boolean | void> {
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
    await this.initPairInfo();
    await this.cancelOrders();

    const balance =
      (await walletLiveInstance.getCoinAmount(this.#baseCoin)) || 0;
    const fullQty = balance / price;
    let buyQty = fullQty * percentage;

    const rate = price > 0 ? this.#makerRate : this.#takerRate;

    buyQty = buyQty - buyQty * rate; //Cut the fees

    if (this.#precision && this.#precision !== 0)
      buyQty = Math.floor(buyQty / this.#precision) * this.#precision;

    if (buyQty > this.#maxQty) buyQty = this.#maxQty;

    if (buyQty < this.#minQty) {
      console.warn("Insufficient balance");
      return false;
    }

    const request: OrderParamsV5 = {
      category: !this.#isFuture ? "spot" : "linear",
      symbol: this.#pair,
      orderType: price > 0 ? "Limit" : "Market",
      price: price > 0 ? price.toFixed(this.#priceDigits) : undefined,
      qty: buyQty.toFixed(this.#qtyDigits),
      side: "Buy",
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

  //Create a spot sell order
  async postSellOrder(
    price: number,
    percentage: number = 1
  ): Promise<boolean | void> {
    await this.initPairInfo();
    await this.cancelOrders();
    const fullQty =
      (await walletLiveInstance.getCoinAmount(this.quotationCoin)) || 0;
    let sellQty = fullQty * percentage;

    const rate = price > 0 ? this.#makerRate : this.#takerRate;
    sellQty = sellQty - sellQty * rate;

    if (this.#precision && this.#precision !== 0)
      sellQty = Math.floor(sellQty / this.#precision) * this.#precision;

    if (sellQty > this.#maxQty) sellQty = this.#maxQty;

    if (sellQty < this.#minQty) {
      console.warn("Insufficient balance");
      return false;
    }

    const request: OrderParamsV5 = {
      category: !this.#isFuture ? "spot" : "linear",
      symbol: this.#pair,
      orderType: price > 0 ? "Limit" : "Market",
      price: price > 0 ? price.toFixed(this.#priceDigits) : undefined,
      qty: sellQty.toFixed(this.#qtyDigits),
      side: "Sell",
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

  async getOpenFuturePositions(): Promise<PositionV5[] | void> {
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
    await this.initPairInfo();
    const positions = await this.getOpenFuturePositions();

    if (!positions) return;

    for (let postion of positions) {
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
