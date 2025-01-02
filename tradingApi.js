const { RestClientV5 } = require("bybit-api");
const { DateTime } = require("luxon");

const restClient = new RestClientV5({
  testnet: process.env.BYBIT_API_TESTNET.toLowerCase() == "true",
  key: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_API_SECRET,
});

async function getMarketCandles() {
  const now = DateTime.now();
  const candlesSet = new Map();

  for (let pair of pairs) {
    pairResponse = await restClient.getKline({
      category: "spot",
      symbol: pair.name,
      interval: pair.time,
      end: now.valueOf(),
      start: now.minus({ months: 1 }).valueOf(),
    });

    const candles = pairResponse.result.list.map((r) => ({
      startTime: new Date(parseInt(r[0])),
      openPrice: parseFloat(r[1]),
      highPrice: parseFloat(r[2]),
      lowPrice: parseFloat(r[3]),
      closePrice: parseFloat(r[4]),
    }));

    candlesSet.set(pair.name.toUpperCase() + "." + pair.time, {
      name: pair.name.toUpperCase(),
      time: pair.time,
      candles: new Map(candles.map((r) => [r.startTime, r])),
    });
  }

  return candlesSet;
}

async function getBalance() {
  const response = await restClient.getWalletBalance({
    accountType: "UNIFIED",
  });

  return response;
}

async function postTrade(pair, price, side, percentage = 1) {
  const balance = await getBalance();
  const buyAmount = balance * percentage;
  const qty = (buyAmount / price).toFixed(3);
  const response = await restClient.submitOrder({
    category: "spot",
    symbol: pair,
    orderType: "Limit",
    qty: qty,
    side: side,
  });

  return response;
}

module.exports = { getMarketCandles, postTrade, getBalance };
