import { OrderParamsV5 } from "bybit-api";
import { restClient } from "../service/tradingApi";
import { CandleType } from "../service/types";
import TimeFrameRepo from "./timeFrameRepo";
import wallet from "./walletRepo";
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
    timeFrames: string[] = [],
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

    for (let timeframe of timeFrames)
      this.#timeFrames.set(timeframe, new TimeFrameRepo(pair, timeframe));
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

  addCandle(timeFrame: string, candle: CandleType) {
    if (this.#timeFrames.has(timeFrame))
      this.#timeFrames.get(timeFrame)?.addCandle(candle);
  }

  cleanup() {
    this.#timeFrames.forEach((value, key) => value.cleanup());
  }

  async initPairInfo(isFuture = false) {
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
        category: !this.#isFuture ? "spot" : "linear",
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

  async cancelSpotOrders(): Promise<boolean | void> {
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
  async postBuySpotOrder(
    price: number,
    percentage: number = 1
  ): Promise<boolean | void> {
    this.initPairInfo();

    await this.cancelSpotOrders();
    const balance = (await wallet.getCoinAmount(this.#baseCoin)) || 0;
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
  async postSellSpotOrder(
    price: number,
    percentage: number = 1
  ): Promise<boolean | void> {
    await this.cancelSpotOrders();
    const fullQty = (await wallet.getCoinAmount(this.quotationCoin)) || 0;
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
}

export default PairRepo;
