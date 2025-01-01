require("dotenv").config();

const { RestClientV5 } = require("bybit-api");
const { WebsocketClient } = require("bybit-api");
const { DateTime } = require("luxon");
const pairs = require("./pairs");
const { notifyTelegram } = require("./telgramClient");

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

async function getBalance() {
  const response = await restClient.getWalletBalance({
    accountType: "UNIFIED",
  });

  return response;
}

async function trade(pair, price, side, percentage = 1) {
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

function getClosePrices(candles) {
  const canndlesArray = Array.from(candles.values());
  canndlesArray.sort((a, b) => a.startTime - b.startTime);
  const closePrices = canndlesArray.map((r) => r.closePrice);
  return closePrices;
}

async function startTradingBot(onUpdate) {
  loadMarketCandles();

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

          if (onUpdate) {
            const closePrices = getClosePrices(pairData.candles);

            const openPosition = (side, percentage) => {
              trade(pairName, candle.closePrice, side, percentage);
              notifyTelegram(
                `Position opened\r\nPair: ${pairName}\r\nType: ${side}`
              );
            };

            const closePosition = (side, percentage) => {
              //
            };

            onUpdate(
              pairName,
              candle,
              pairData,
              closePrices,
              currentPrice,
              openPosition,
              closePosition
            );
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

module.exports = { startTradingBot, loadMarketCandles, getClosePrices };
