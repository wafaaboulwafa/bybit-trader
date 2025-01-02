const { RestClientV5 } = require("bybit-api");
const { DateTime } = require("luxon");

const restClient = new RestClientV5({
  testnet: process.env.BYBIT_API_TESTNET.toLowerCase() == "true",
  key: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_API_SECRET,
});

function print(object) {
  console.log(JSON.stringify(object, null, 4));
}

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

async function cancelOrders(pair) {
  const response = await restClient
    .cancelAllOrders({
      category: "spot",
      symbol: pair,
    })
    .then((r) => r.result.success);

  return response;
}

async function postTrade(pair, price, side, percentage = 1) {
  await cancelOrders(pair);

  const balance = await getBalance();
  const fullQty = balance / price;
  const buyQty = fullQty * percentage;

  const response = await restClient
    .submitOrder({
      category: "spot",
      symbol: pair,
      orderType: "Limit",
      price: price.toString(),
      qty: buyQty.toFixed(6).toString(),
      side: side,
      timeInForce: "GTC",
    })
    .then((r) => r.result.orderId);

  return response;
}

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

module.exports = {
  getMarketCandles,
  postTrade,
  getEquity,
  cancelOrders,
  getCoinBalance,
};
