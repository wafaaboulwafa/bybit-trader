import { CandleType } from "../service/types";

class TimeFrameRepo {
  #candlesMap: Map<number, CandleType> = new Map<number, CandleType>();
  #candles: CandleType[] = [];
  #closePrices: number[] = [];
  #ohlc4: number[] = [];
  #maxSize = 1000;

  constructor(initialValues: CandleType[] = []) {
    this.initialize(initialValues);
  }

  initialize(initialValues: CandleType[]) {
    this.#candlesMap.clear();
    this.#candles = [];
    this.#closePrices = [];
    this.#ohlc4 = [];

    for (let c of initialValues) this.addCandle(c);
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
}

export default TimeFrameRepo;
