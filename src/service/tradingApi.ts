import { CandleType, MarketDataType, PairConfigType } from "./types";
import { KlineIntervalV3, RestClientV5 } from "bybit-api";
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

  while (moreData) {
    let pairResponse = await restClient.getKline({
      category: "spot",
      symbol: pair,
      interval: timeFrame.toString() as KlineIntervalV3,
      start: (startDate && startDate.valueOf()) || 0,
      end: (endDate && endDate.valueOf()) || 0,
      limit: 1000,
    });

    const candles: CandleType[] = pairResponse.result.list.map((r: any) => ({
      key: parseInt(r[0]),
      startTime: new Date(parseInt(r[0])),
      openPrice: parseFloat(r[1]),
      highPrice: parseFloat(r[2]),
      lowPrice: parseFloat(r[3]),
      closePrice: parseFloat(r[4]),
    }));

    let maxCandleDate: number = 0;
    for (let candle of candles) {
      candlesSet.set(candle.key, candle);
      if (candle.key > maxCandleDate) maxCandleDate = candle.key;
    }

    startDate = DateTime.fromMillis(maxCandleDate);
    moreData =
      (pairResponse?.result?.list?.length > 0 &&
        endDate &&
        endDate.diff(startDate, "days").days > 2) ||
      false;
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

    const candles: CandleType[] = pairResponse.result.list.map((r: any) => ({
      key: r[0],
      startTime: new Date(parseInt(r[0])),
      openPrice: parseFloat(r[1]),
      highPrice: parseFloat(r[2]),
      lowPrice: parseFloat(r[3]),
      closePrice: parseFloat(r[4]),
    }));

    candlesSet.set(rec.pairName.toUpperCase() + "." + rec.timeFrame, {
      name: rec.pairName.toUpperCase(),
      time: rec.timeFrame,
      candles: new Map(candles.map((r) => [r.key, r])),
    });
  }
}

//Get equity total value for unified account
export async function getEquity() {
  const response = await restClient
    .getWalletBalance({
      accountType: "UNIFIED",
    })
    .then((r: any) => {
      const coins = r.result.list.find((x: any) => (x.accountType = "UNIFIED"));
      if (coins) return coins.totalEquity;
      return 0;
    });
  return response;
}

//Cancel all spot pending orders for a pair
export async function cancelSpotOrders(pair: string) {
  const response = await restClient
    .cancelAllOrders({
      category: "spot",
      symbol: pair,
    })
    .then((r: any) => r.result.success);

  return response;
}

//Get coin balance for unified account
export async function getCoinBalance(coin: string) {
  const response = await restClient
    .getWalletBalance({
      accountType: "UNIFIED",
    })
    .then((r: any) => {
      const coins = r.result.list.find((n: any) => (n.accountType = "UNIFIED"));

      if (coins && coins.coin.length > 0) {
        const coinRec = coins.coin.find(
          (n: any) => n.coin.toLowerCase() === coin.toLowerCase()
        );

        if (coinRec) return coinRec.equity;
      }

      return 0;
    });

  return response;
}

//Get spot fees rate for a coin
export async function getSpotFeesRate(symbol: string, coin: string) {
  const response = await restClient
    .getFeeRate({
      category: "spot",
      symbol,
      baseCoin: coin,
    })
    .then((r: any) => {
      const feesRec = r.result.list[0];
      return {
        takerFeeRate: parseFloat(feesRec?.takerFeeRate || 0),
        makerFeeRate: parseFloat(feesRec?.makerFeeRate || 0),
      };
    });

  return response;
}

//Create a spot buy order
export async function postBuySpotOrder(
  pair: string,
  coin: string = "USDT",
  price: number,
  percentage: number = 1
) {
  await cancelSpotOrders(pair);
  const balance = await getCoinBalance(coin);
  const fullQty = balance / price;
  const buyQty = fullQty * percentage;

  const feesRate = await getSpotFeesRate(pair, coin);
  const rate = price > 0 ? feesRate.takerFeeRate : feesRate.makerFeeRate;
  const fees = buyQty * rate;

  const response = await restClient
    .submitOrder({
      category: "spot",
      symbol: pair,
      orderType: price > 0 ? "Limit" : "Market",
      price: price > 0 ? price.toString() : undefined,
      qty: (buyQty - fees).toFixed(6).toString(),
      side: "Buy",
      timeInForce: "GTC",
    })
    .then((r: any) => r.result.orderId);

  return response;
}

//Create a spot sell order
export async function postSellSpotOrder(
  pair: string,
  coin: string,
  price: number,
  percentage: number = 1
) {
  await cancelSpotOrders(pair);
  const fullQty = await getCoinBalance(coin);
  const sellQty = fullQty * percentage;

  const feesRate = await getSpotFeesRate(pair, coin);
  const rate = price > 0 ? feesRate.takerFeeRate : feesRate.makerFeeRate;
  const fees = sellQty * rate;

  const response = await restClient
    .submitOrder({
      category: "spot",
      symbol: pair,
      orderType: price > 0 ? "Limit" : "Market",
      price: price > 0 ? price.toString() : undefined,
      qty: (sellQty - fees).toFixed(6).toString(),
      side: "Sell",
      timeInForce: "GTC",
    })
    .then((r: any) => r.result.orderId);

  return response;
}
