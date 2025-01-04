const { RestClientV5 } = require("bybit-api");
const { DateTime } = require("luxon");
const pairs = require("../constants/config.json");

//ByBit rest client
const restClient = new RestClientV5({
  testnet: process.env.BYBIT_API_TESTNET.toLowerCase() == "true",
  key: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_API_SECRET,
});

async function loadPairSpotMarketCandles(
  candlesSet,
  pair,
  timeFrame = 1,
  start = null,
  end = null
) {
  candlesSet.clear();

  let endDate = end === null ? DateTime.now() : null;
  let startDate = start === null ? endDate.minus({ years: 2 }) : start;
  let moreData = true;

  while (moreData) {
    pairResponse = await restClient.getKline({
      category: "spot",
      symbol: pair,
      interval: timeFrame,
      end: startDate.valueOf(),
      start: endDate.valueOf(),
      limit: 1000,
    });

    const candles = pairResponse.result.list.map((r) => ({
      key: r[0],
      startTime: new Date(parseInt(r[0])),
      openPrice: parseFloat(r[1]),
      highPrice: parseFloat(r[2]),
      lowPrice: parseFloat(r[3]),
      closePrice: parseFloat(r[4]),
    }));

    let maxCandleDate = 0;
    for (let candle in candles) {
      candlesSet.set(candle.key, candle);
      if (candle.key > maxCandleDate) maxCandleDate = candle.key;
    }

    startDate = DateTime.fromJSDate(maxDate);
    moreData = endDate.diff(startDate, "days").days > 2;
  }
}

//Get candles history for spot pair
async function loadSpotMarketCandles(candlesSet) {
  const now = DateTime.now();

  for (let rec of pairs) {
    pairResponse = await restClient.getKline({
      category: "spot",
      symbol: rec.pair,
      interval: rec.time,
      end: now.valueOf(),
      start: now.minus({ months: 1 }).valueOf(),
      limit: 1000,
    });

    const candles = pairResponse.result.list.map((r) => ({
      key: r[0],
      startTime: new Date(parseInt(r[0])),
      openPrice: parseFloat(r[1]),
      highPrice: parseFloat(r[2]),
      lowPrice: parseFloat(r[3]),
      closePrice: parseFloat(r[4]),
    }));

    candlesSet.set(rec.pair.toUpperCase() + "." + rec.time, {
      name: rec.pair.toUpperCase(),
      time: rec.time,
      candles: new Map(candles.map((r) => [r.key, r])),
    });
  }
}

//Get equity total value for unified account
async function getEquity() {
  const response = await restClient
    .getWalletBalance({
      accountType: "UNIFIED",
    })
    .then((r) => {
      const coins = r.result.list.find((r) => (accountType = "UNIFIED"));
      if (coins) return coins.totalEquity;
      return 0;
    });
  return response;
}

//Cancel all spot pending orders for a pair
async function cancelSpotOrders(pair) {
  const response = await restClient
    .cancelAllOrders({
      category: "spot",
      symbol: pair,
    })
    .then((r) => r.result.success);

  return response;
}

//Get coin balance for unified account
async function getCoinBalance(coin) {
  const response = await restClient
    .getWalletBalance({
      accountType: "UNIFIED",
    })
    .then((r) => {
      const coins = r.result.list.find((r) => (accountType = "UNIFIED"));

      if (coins && coins.coin.length > 0) {
        const coinRec = coins.coin.find(
          (n) => n.coin.toLowerCase() === coin.toLowerCase()
        );

        if (coinRec) return coinRec.equity;
      }

      return 0;
    });

  return response;
}

//Get spot fees rate for a coin
async function getSpotFeesRate(symbol, coin) {
  const response = await restClient
    .getFeeRate({
      category: "spot",
      symbol,
      baseCoin: coin,
    })
    .then((r) => {
      const feesRec = r.result.list[0];
      return {
        takerFeeRate: parseFloat(feesRec?.takerFeeRate || 0),
        makerFeeRate: parseFloat(feesRec?.makerFeeRate || 0),
      };
    });

  return response;
}

//Create a spot buy order
async function postBuySpotOrder(pair, coin = "USDT", price, percentage = 1) {
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
      price: price > 0 ? price.toString() : null,
      qty: (buyQty - fees).toFixed(6).toString(),
      side: "Buy",
      timeInForce: "GTC",
    })
    .then((r) => r.result.orderId);

  return response;
}

//Create a spot sell order
async function postSellSpotOrder(pair, coin, price, percentage = 1) {
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
      price: price > 0 ? price.toString() : null,
      qty: (sellQty - fees).toFixed(6).toString(),
      side: "Sell",
      timeInForce: "GTC",
    })
    .then((r) => r.result.orderId);

  return response;
}

module.exports = {
  loadPairSpotMarketCandles,
  loadSpotMarketCandles,
  postSellSpotOrder,
  postBuySpotOrder,
  getEquity,
  cancelSpotOrders,
  getCoinBalance,
  getSpotFeesRate,
};
