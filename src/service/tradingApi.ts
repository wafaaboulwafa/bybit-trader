import { CandleType } from "./types";
import { KlineIntervalV3, RestClientV5 } from "bybit-api";
import { DateTime } from "luxon";

//ByBit rest client
export const restClient = new RestClientV5({
  testnet: (process.env.BYBIT_API_TESTNET || "").toLowerCase() == "true",
  demoTrading:
    (process.env.BYBIT_API_DEMO || "").toLowerCase() === "true"
      ? true
      : undefined,
  key: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_API_SECRET,
});

export async function loadPairSpotMarketCandles(
  candlesSet: Map<number, CandleType>,
  pair: string,
  timeFrame: number = 1,
  start: Date | null = null,
  end: Date | null = null
) {
  candlesSet.clear();

  let endDate: DateTime | null = end === null ? DateTime.now() : null;
  let startDate: DateTime | null =
    start === null && endDate !== null
      ? endDate.minus({ years: 2 })
      : start !== null
      ? DateTime.fromJSDate(start)
      : null;

  let moreData = true;

  let loadingStartDate = startDate;
  let loadingEndDate = endDate;

  while (moreData) {
    let pairResponse = await restClient.getKline({
      category: "spot",
      symbol: pair,
      interval: timeFrame.toString() as KlineIntervalV3,
      start: (loadingStartDate && loadingStartDate.valueOf()) || 0,
      end: (loadingEndDate && loadingEndDate.valueOf()) || 0,
      limit: 1000,
    });

    if (pairResponse.retCode > 0)
      console.warn(pairResponse.retCode + " - " + pairResponse.retMsg);

    const candles: CandleType[] =
      (pairResponse.result.list &&
        pairResponse.result.list.map((r: any) => ({
          key: parseInt(r[0]),
          startTime: new Date(parseInt(r[0])),
          openPrice: parseFloat(r[1]),
          highPrice: parseFloat(r[2]),
          lowPrice: parseFloat(r[3]),
          closePrice: parseFloat(r[4]),
        }))) ||
      [];

    let minCandleDate: number = 0;
    let maxCandleDate: number = 0;

    for (let candle of candles) {
      candlesSet.set(candle.key, candle);
      if (minCandleDate === 0 || candle.key < minCandleDate)
        minCandleDate = candle.key;
      if (maxCandleDate === 0 || candle.key > maxCandleDate)
        maxCandleDate = candle.key;
    }

    const loadedMinDate = DateTime.fromMillis(minCandleDate);
    const loadedMaxDate = DateTime.fromMillis(maxCandleDate);

    console.log(
      `Load data ${pair}, From: ${loadedMinDate.toString()}, To: ${loadedMaxDate.toString()}`
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
}
