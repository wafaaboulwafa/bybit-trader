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

process.once("SIGINT", (code) => wsClient.closeAll(true));
process.once("SIGTERM", (code) => wsClient.closeAll(true));

async function loadMarketCandles() {
  const now = DateTime.now();

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

    marketCandles.set(pair.name.toUpperCase() + "." + pair.time, {
      name: pair.name.toUpperCase(),
      time: pair.time,
      candles: new Map(candles.map((r) => [r.startTime, r])),
    });
  }
}

function getClosePrices(candles) {
  const canndlesArray = Array.from(candles.values());
  canndlesArray.sort((a, b) => a.startTime - b.startTime);
  const closePrices = canndlesArray.map((r) => r.closePrice);
  return closePrices;
}

async function startServer(onNewCandle) {
  //loadMarketCandles();

  const topics = pairs.map((r) => "kline." + r.time + "." + r.name);

  wsClient.on("update", (data) => {
    if (data.topic.startsWith("kline.")) {
      const reg = /^kline\.(.+)\.(.+)$/gi;
      const matches = reg.exec(data.topic);

      if (matches.length > 2) {
        const pairName = matches[2].toUpperCase();
        const timeFrame = matches[1];
        const pairKey = pairName + "." + timeFrame;

        if (!marketCandles.has(pairKey)) {
          marketCandles.set(pairKey, {
            name: pairName,
            time: timeFrame,
            candles: new Map(),
          });
        }

        const pairData = marketCandles.get(pairKey);

        for (let r of data.data) {
          const candle = {
            startTime: new Date(parseInt(r.start)),
            openPrice: parseFloat(r.open),
            highPrice: parseFloat(r.high),
            lowPrice: parseFloat(r.low),
            closePrice: parseFloat(r.close),
          };

          if (!pairData.candles.has(candle.startTime)) {
            pairData.candles.set(candle.startTime, candle);
            marketCandles.set(pairKey, pairData);
          }

          if (onNewCandle) {
            const closePrices = getClosePrices();
            onNewCandle(pairName, candle, pairData, closePrices);
          }
        }

        //console.log(marketCandles);
      }
    }
  });

  wsClient.subscribeV5(topics, "spot");
  wsClient.subscribeV5("position", "spot");
  wsClient.subscribeV5("execution", "spot");
  wsClient.subscribeV5(["order", "wallet", "greeks"], "spot");
}

module.exports = { startServer };
