import { CandleType, MarketDataType, PairConfigType } from "./types";
import {
  FeeRateV5,
  KlineIntervalV3,
  RestClientV5,
  SpotInstrumentInfoV5,
} from "bybit-api";
import { DateTime } from "luxon";

const pairs: PairConfigType[] = require("../../constants/config.json");

//ByBit rest client
const restClient = new RestClientV5({
  testnet: (process.env.BYBIT_API_TESTNET || "").toLowerCase() == "true",
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

//Get candles history for spot pair
export async function loadSpotMarketCandles(
  candlesSet: Map<string, MarketDataType>
) {
  const now = DateTime.now();

  for (let rec of pairs) {
    let pairResponse = await restClient.getKline({
      category: "spot",
      symbol: rec.pairName,
      interval: rec.timeFrame.toString() as KlineIntervalV3,
      end: now.valueOf(),
      start: now.minus({ months: 1 }).valueOf(),
      limit: 1000,
    });

    if (pairResponse.retCode > 0)
      console.warn(pairResponse.retCode + " - " + pairResponse.retMsg);

    const candles: CandleType[] =
      (pairResponse.result.list &&
        pairResponse.result.list.map((r: any) => ({
          key: r[0],
          startTime: new Date(parseInt(r[0])),
          openPrice: parseFloat(r[1]),
          highPrice: parseFloat(r[2]),
          lowPrice: parseFloat(r[3]),
          closePrice: parseFloat(r[4]),
        }))) ||
      [];

    candlesSet.set(rec.pairName.toUpperCase() + "." + rec.timeFrame, {
      name: rec.pairName.toUpperCase(),
      time: rec.timeFrame,
      candles: new Map(candles.map((r) => [r.key, r])),
    });

    console.log(`Load data ${rec.pairName}, Total: ${candles.length}`);
  }
}

//Get equity total value for unified account
export async function getEquity(): Promise<number | void> {
  return await restClient
    .getWalletBalance({
      accountType: "UNIFIED",
    })
    .then((r) => {
      if (r.retCode > 0) console.warn(r.retCode + " - " + r.retMsg);
      if (r.result.list) {
        const coins = r.result.list.find(
          (x: any) => (x.accountType = "UNIFIED")
        );
        if (coins) return parseFloat(coins.totalEquity);
      }
      return 0;
    })
    .catch((e) => {
      console.warn(e);
    });
}

//Cancel all spot pending orders for a pair
export async function cancelSpotOrders(pair: string): Promise<boolean | void> {
  const response = await restClient
    .cancelAllOrders({
      category: "spot",
      symbol: pair,
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

//Get coin balance for unified account
export async function getCoinBalance(coin: string): Promise<number | void> {
  const response = await restClient
    .getWalletBalance({
      accountType: "UNIFIED",
    })
    .then((r) => {
      if (r.retCode > 0) console.warn(r.retCode + " - " + r.retMsg);
      const coins = r.result.list.find((n: any) => (n.accountType = "UNIFIED"));

      if (coins && coins.coin.length > 0) {
        const coinRec = coins.coin.find(
          (n: any) => n.coin.toLowerCase() === coin.toLowerCase()
        );

        if (coinRec) return parseFloat(coinRec.equity);
      }

      return 0;
    })
    .catch((e) => {
      console.warn(e);
    });

  return response;
}

//Get spot fees rate for a coin
export async function getSpotFeesRate(
  symbol: string,
  coin: string,
  isLimit: boolean
): Promise<number | void> {
  const response = await restClient
    .getFeeRate({
      category: "spot",
      symbol,
      baseCoin: coin,
    })
    .then((r) => {
      if (r.retCode > 0) console.warn(r.retCode + " - " + r.retMsg);
      const feesRec = (r.result.list && r.result.list[0]) || undefined;

      if (!feesRec) return 0;

      return isLimit
        ? parseFloat(feesRec.takerFeeRate)
        : parseFloat(feesRec.makerFeeRate);
    })
    .catch((e) => {
      console.warn(e);
    });

  return response;
}

//Create a spot buy order
export async function postBuySpotOrder(
  pair: string,
  coin: string = "USDT",
  price: number,
  percentage: number = 1
): Promise<boolean | void> {
  await cancelSpotOrders(pair);
  const balance = (await getCoinBalance(coin)) || 0;
  const fullQty = balance / price;
  let buyQty = fullQty * percentage;

  const rate = (await getSpotFeesRate(pair, coin, price > 0)) || 0;

  buyQty = buyQty - buyQty * rate; //Cut the fees

  const symboleInfo = await getSpotSymboleInfo(pair);

  if (!symboleInfo) {
    console.warn("Invalid symbol info");
    return;
  }

  const precision = parseFloat(symboleInfo?.lotSizeFilter?.basePrecision);
  const maxQty = parseFloat(symboleInfo?.lotSizeFilter.maxOrderQty);
  const minQty = parseFloat(symboleInfo?.lotSizeFilter.minOrderQty);

  if (precision && precision !== 0)
    buyQty = Math.floor(buyQty / precision) * precision;

  if (buyQty > maxQty) buyQty = maxQty;
  if (buyQty < minQty) buyQty = minQty;

  const response = await restClient
    .submitOrder({
      category: "spot",
      symbol: pair,
      orderType: price > 0 ? "Limit" : "Market",
      price: price > 0 ? price.toString() : undefined,
      qty: buyQty.toString(),
      side: "Buy",
      timeInForce: "GTC",
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

//Create a spot sell order
export async function postSellSpotOrder(
  pair: string,
  coin: string,
  price: number,
  percentage: number = 1
): Promise<boolean | void> {
  await cancelSpotOrders(pair);
  const fullQty = (await getCoinBalance(coin)) || 0;
  let sellQty = fullQty * percentage;

  const rate = (await getSpotFeesRate(pair, coin, price > 0)) || 0;
  sellQty = sellQty - sellQty * rate;

  const symboleInfo = await getSpotSymboleInfo(pair);

  if (!symboleInfo) {
    console.warn("Invalid symbol info");
    return;
  }

  const precision = parseFloat(symboleInfo?.lotSizeFilter?.quotePrecision);
  const maxQty = parseFloat(symboleInfo?.lotSizeFilter.maxOrderAmt);
  const minQty = parseFloat(symboleInfo?.lotSizeFilter.minOrderAmt);

  if (precision && precision !== 0)
    sellQty = Math.floor(sellQty / precision) * precision;

  if (sellQty > maxQty) sellQty = maxQty;
  if (sellQty < minQty) sellQty = minQty;

  const response = await restClient
    .submitOrder({
      category: "spot",
      symbol: pair,
      orderType: price > 0 ? "Limit" : "Market",
      price: price > 0 ? price.toString() : undefined,
      qty: sellQty.toString(),
      side: "Sell",
      timeInForce: "GTC",
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

//Get spot fees rate for a coin
export async function getSpotSymboleInfo(
  symbol: string
): Promise<SpotInstrumentInfoV5 | void> {
  const response = await restClient
    .getInstrumentsInfo({
      category: "spot",
      symbol,
    })
    .then((r) => {
      if (r.retCode > 0) console.warn(r.retCode + " - " + r.retMsg);
      if (r.result.list.length > 0) return r.result.list[0];
    })
    .catch((e) => {
      console.warn(e);
    });

  return response;
}

export function getMinutesBetweenDates(date1: Date, date2: Date) {
  const diffInMs = date1.valueOf() - date2.valueOf();
  const diffInMinutes = Math.floor(diffInMs / 60000); // 60000 ms in a minute
  return diffInMinutes;
}
