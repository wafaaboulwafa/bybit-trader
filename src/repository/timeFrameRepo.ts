import { DateTime } from "luxon";
import { CandleType } from "../service/types";
import { restClient } from "../service/tradingApi";
import { KlineIntervalV3 } from "bybit-api";

class TimeFrameRepo {
  #candlesMap: Map<number, CandleType> = new Map<number, CandleType>();
  #candles: CandleType[] = [];
  #closePrices: number[] = [];
  #ohlc4: number[] = [];
  #maxSize = 1000;

  constructor(pairName: string, timeFrame: string) {
    this.loadMarketCandles(pairName, timeFrame);
  }

  addCandle(candle: CandleType) {
    const ohlc4: number =
      (candle.openPrice +
        candle.highPrice +
        candle.lowPrice +
        candle.closePrice) /
      4;
    if (!this.#candlesMap.has(candle.key)) {
      this.#candlesMap.set(candle.key, candle);
      this.#candles.push(candle);
      this.#closePrices.push(candle.closePrice);
      this.#ohlc4.push(ohlc4);
    } else {
      this.#candlesMap.set(candle.key, candle);
      this.#candles[this.#candles.length - 1] = candle;
      this.#closePrices[this.#closePrices.length - 1] = candle.closePrice;
      this.#ohlc4[this.#ohlc4.length - 1] = ohlc4;
    }

    if (this.#candles.length > this.#maxSize * 2) this.cleanup();
  }

  cleanup() {
    let canndlesArray = Array.from(this.#candlesMap.values());
    canndlesArray.sort((a, b) => a.key - b.key);

    if (canndlesArray.length > this.#maxSize)
      canndlesArray = canndlesArray.slice(-1 * this.#maxSize);

    this.#candlesMap.clear();
    canndlesArray.forEach((r) => this.#candlesMap.set(r.key, r));

    this.#ohlc4 = canndlesArray.map(
      (r) => (r.openPrice + r.highPrice + r.lowPrice + r.closePrice) / 4
    );
  }

  #candlesProxy: any = null;
  get candle() {
    if (this.#candlesProxy === null)
      this.#candlesProxy = new Proxy(this, {
        get: (target, prop: string) => this.#candles[parseInt(prop)],
        set: (target, prop) => true,
      });

    return this.#candlesProxy;
  }

  #closePriceProxy: any = null;
  get closePrice() {
    if (this.#closePriceProxy === null)
      this.#closePriceProxy = new Proxy(this, {
        get: (target, prop: string) => this.#closePrices[parseInt(prop)],
        set: (target, prop) => true,
      });

    return this.#closePriceProxy;
  }

  #ohlc4Proxy: any = null;
  get ohlc4() {
    if (this.#ohlc4Proxy === null)
      this.#ohlc4Proxy = new Proxy(this, {
        get: (target, prop: string) => this.#ohlc4[parseInt(prop)],
        set: (target, prop) => true,
      });

    return this.#ohlc4Proxy;
  }

  get length() {
    return this.#candles.length;
  }

  //Get candles history for spot pair
  async loadMarketCandles(
    pairName: string,
    timeFrame: string,
    isFuture: boolean = false
  ) {
    this.#candlesMap.clear();
    this.#candles = [];
    this.#closePrices = [];
    this.#ohlc4 = [];

    const now = DateTime.now();

    let pairResponse = await restClient.getKline({
      category: !isFuture ? "spot" : "linear",
      symbol: pairName,
      interval: timeFrame.toString() as KlineIntervalV3,
      end: now.valueOf(),
      start: now.minus({ months: 1 }).valueOf(),
      limit: 1000,
    });

    if (pairResponse.retCode > 0)
      console.warn(pairResponse.retCode + " - " + pairResponse.retMsg);

    for (let r of pairResponse.result.list) {
      const candle: CandleType = {
        key: parseInt(r[0]),
        startTime: new Date(parseInt(r[0])),
        openPrice: parseFloat(r[1]),
        highPrice: parseFloat(r[2]),
        lowPrice: parseFloat(r[3]),
        closePrice: parseFloat(r[4]),
      };
      this.addCandle(candle);
    }
  }
}

export default TimeFrameRepo;
