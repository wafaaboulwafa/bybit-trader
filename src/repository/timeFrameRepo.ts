import { DateTime } from "luxon";
import { CandleType } from "../service/types";
import { restClient } from "../service/bybitClient";
import { KlineIntervalV3 } from "bybit-api";

class TimeFrameRepo {
  #candlesMap: Map<number, CandleType> = new Map<number, CandleType>();
  #candles: CandleType[] = [];
  #closePrices: number[] = [];
  #ohlc4: number[] = [];
  #maxSize = 1000;

  constructor() {}

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

    if (this.#maxSize > 0 && this.#candles.length > this.#maxSize * 2)
      this.cleanup();
  }

  cleanup() {
    let canndlesArray = Array.from(this.#candlesMap.values());
    canndlesArray.sort((a, b) => a.key - b.key);

    //Avoid truncate for backtest
    if (this.#maxSize > 0 && canndlesArray.length > this.#maxSize)
      canndlesArray = canndlesArray.slice(-1 * this.#maxSize);

    this.#candlesMap.clear();
    canndlesArray.forEach((r) => this.#candlesMap.set(r.key, r));

    this.#ohlc4 = canndlesArray.map(
      (r) => (r.openPrice + r.highPrice + r.lowPrice + r.closePrice) / 4
    );
  }

  get candle(): CandleType[] {
    return this.#candles;
  }

  get closePrice(): number[] {
    return this.#closePrices;
  }

  get ohlc4(): number[] {
    return this.#ohlc4;
  }

  get length() {
    return this.#candles.length;
  }

  //Get candles history for spot pair
  async init(pairName: string, timeFrame: string, isFuture: boolean) {
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

    if (pairResponse.retCode > 0) {
      console.warn(pairResponse.retCode + " - " + pairResponse.retMsg);
      return;
    }

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

    //sort
    this.cleanup();
  }

  async loadPairBacktestHistoryCandles(
    pairName: string,
    timeFrame: string,
    isFuture: boolean,
    start: Date | null = null,
    end: Date | null = null
  ) {
    this.#candlesMap.clear();
    this.#candles = [];
    this.#closePrices = [];
    this.#ohlc4 = [];
    this.#maxSize = 0;

    let endDate: DateTime | null = end === null ? DateTime.now() : null;
    let startDate: DateTime | null =
      start === null && endDate !== null
        ? endDate.minus({ month: 1 })
        : start !== null
        ? DateTime.fromJSDate(start)
        : null;

    let moreData = true;

    let loadingStartDate = startDate;
    let loadingEndDate = endDate;

    while (moreData) {
      let pairResponse = await restClient.getKline({
        category: !isFuture ? "spot" : "linear",
        symbol: pairName,
        interval: timeFrame as KlineIntervalV3,
        start: (loadingStartDate && loadingStartDate.valueOf()) || 0,
        end: (loadingEndDate && loadingEndDate.valueOf()) || 0,
        limit: 1000,
      });

      if (pairResponse.retCode > 0)
        console.warn(pairResponse.retCode + " - " + pairResponse.retMsg);

      let minCandleDate: number = 0;
      let maxCandleDate: number = 0;

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
        if (minCandleDate === 0 || candle.key < minCandleDate)
          minCandleDate = candle.key;
        if (maxCandleDate === 0 || candle.key > maxCandleDate)
          maxCandleDate = candle.key;
      }

      const loadedMinDate = DateTime.fromMillis(minCandleDate);
      const loadedMaxDate = DateTime.fromMillis(maxCandleDate);

      console.log(
        `Load data ${pairName}, From: ${loadedMinDate.toString()}, To: ${loadedMaxDate.toString()}`
      );

      moreData =
        (pairResponse?.result?.list?.length > 0 &&
          startDate &&
          loadedMinDate.diff(startDate, "days").days > 0) ||
        false;

      if (moreData) {
        if (loadingEndDate?.valueOf() != loadedMinDate?.valueOf())
          loadingEndDate = loadedMinDate;
        else moreData = false;
      }
    }

    //sort
    this.cleanup();
  }
}

export default TimeFrameRepo;
