require("dotenv").config();
const { RestClientV5 } = require("bybit-api");
const { WebsocketClient } = require("bybit-api");
const { DateTime } = require("luxon");
const pairs = require("./pairs");
const marketCandles = new Map();

const restClient = new RestClientV5({
  testnet: process.env.BYBIT_API_TESTNET.toLowerCase() == "true",
  key: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_API_SECRET,
});

const wsClient = new WebsocketClient({
  market: "v5",
  testnet: process.env.BYBIT_API_TESTNET.toLowerCase() == "true",
  key: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_API_SECRET,
});

process.once("SIGINT", function (code) {
  console.log("Shutdown");
  wsClient.closeAll(true);
});

process.once("SIGTERM", function (code) {
  console.log("Shutdown");
  wsClient.closeAll(true);
});

// wsClient.on("open", (data) => {
//   console.log("connection opened open:", data.wsKey);
// });
// wsClient.on("response", (data) => {
//   console.log("log response: ", JSON.stringify(data, null, 2));
// });
// wsClient.on("reconnect", ({ wsKey }) => {
//   console.log("ws automatically reconnecting.... ", wsKey);
// });
// wsClient.on("reconnected", (data) => {
//   console.log("ws has reconnected ", data?.wsKey);
// });

// wsClient.on('error', (data) => {
//   console.error('ws exception: ', data);
// });

async function startServer(onCandle, onPosition, onExecute) {
  const topics = pairs.map((r) => "kline." + r.time + "." + r.name);
  const now = DateTime.now();

  for (let pair of pairs) {
    console.log(pair);

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

    marketCandles.set(pair.name + "." + pair.time, {
      name: pair.name,
      time: pair.time,
      candles: new Map(candles.map((r) => [r.startTime, r])),
    });
  }

  wsClient.on("update", (data) => {
    //console.log("raw message received ", JSON.stringify(data));

    if (data.topic.startsWith("kline.")) {
      const pairName = "";
      const timeFrame = "";
      const candle = {};
      if (onCandle) onCandle(data.data);
    }
  });

  wsClient.subscribeV5(topics, "spot");
  wsClient.subscribeV5("position", "spot");
  wsClient.subscribeV5("execution", "spot");
  wsClient.subscribeV5(["order", "wallet", "greeks"], "spot");
}

module.exports = { startServer };
