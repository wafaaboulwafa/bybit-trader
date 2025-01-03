const { WebsocketClient } = require("bybit-api");
const pairs = require("./pairs");
const {
  notifyWalletUpdate,
  notifyOrderUpdate,
  notifyExecutionUpdate,
} = require("./telgramClient");
const {
  loadSpotMarketCandles,
  postBuySpotOrder,
  postSellSpotOrder,
} = require("./tradingApi");
const { getClosePrices } = require("./indicators");

const marketCandles = new Map();

const wsClient = new WebsocketClient({
  market: "v5",
  testnet: process.env.BYBIT_API_TESTNET.toLowerCase() == "true",
  key: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_API_SECRET,
});

process.once("SIGINT", (code) => wsClient.closeAll(true));
process.once("SIGTERM", (code) => wsClient.closeAll(true));

async function startTradingBot(onUpdate) {
  await loadSpotMarketCandles(marketCandles);

  wsClient.on("update", (data) => {
    if (data.topic.startsWith("kline.")) {
      const reg = /^kline\.(.+)\.(.+)$/gi;
      const matches = reg.exec(data.topic);

      if (matches.length > 2) {
        const pairName = matches[2].toUpperCase();
        const timeFrame = matches[1];
        const pairKey = pairName + "." + timeFrame;
        const pairInfo = pairs.find((r) => r.pair === pairName);

        if (!pairInfo) return;

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
            key: r.start,
            startTime: new Date(parseInt(r.start)),
            openPrice: parseFloat(r.open),
            highPrice: parseFloat(r.high),
            lowPrice: parseFloat(r.low),
            closePrice: parseFloat(r.close),
          };

          pairData.candles.set(candle.key, candle);

          const closePrices = getClosePrices(pairData.candles);

          const buyPosition = (percentage) => {
            postBuySpotOrder(
              pairInfo.pair,
              pairInfo.buyCoin,
              candle.closePrice,
              percentage
            );
          };

          const sellPosition = (percentage) => {
            postSellSpotOrder(
              pairInfo.pair,
              pairInfo.sellCoin,
              candle.closePrice,
              percentage
            );
          };

          const closePositions = () => {
            postSellSpotOrder(
              pairInfo.pair,
              pairInfo.sellCoin,
              candle.closePrice,
              1
            );
          };

          if (onUpdate) {
            onUpdate(
              pairName,
              timeFrame,
              pairData.candles,
              closePrices,
              candle.closePrice,
              candle,
              buyPosition,
              sellPosition,
              closePositions
            );
          }
        }
      }
    } else if (data.topic === "execution") {
      if (data.data.length > 0) notifyExecutionUpdate(data.data[0]);
    } else if (data.topic === "order") {
      if (data.data.length > 0) notifyOrderUpdate(data.data[0]);
    } else if (data.topic === "wallet") {
      if (data.data.length > 0) notifyWalletUpdate(data.data[0]);
    }
  });

  const topics = pairs.map((r) => "kline." + r.time + "." + r.pair);
  wsClient.subscribeV5([...topics, "order", "execution", "wallet"], "spot");
}

module.exports = { startTradingBot };
