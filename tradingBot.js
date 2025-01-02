const { WebsocketClient } = require("bybit-api");
const pairs = require("./pairs");
const {
  notifyWalletUpdate,
  notifyOrderUpdate,
  notifyExecutionUpdate,
} = require("./telgramClient");
const {
  getMarketCandles,
  postBuyOrder,
  postSellOrder,
} = require("./tradingApi");
const { getClosePrices } = require("./indicators");

let marketCandles = new Map();

const wsClient = new WebsocketClient({
  market: "v5",
  testnet: process.env.BYBIT_API_TESTNET.toLowerCase() == "true",
  key: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_API_SECRET,
});

process.once("SIGINT", (code) => wsClient.closeAll(true));
process.once("SIGTERM", (code) => wsClient.closeAll(true));

function print(object) {
  console.log(JSON.stringify(object, null, 4));
}

async function startTradingBot(onUpdate) {
  marketCandles = getMarketCandles();

  const topics = pairs.map((r) => "kline." + r.time + "." + r.pair);

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
            const pairInfo = pairs.find((r) => r.pair === pairName);

            const openPosition = (side, percentage) => {
              if (pairInfo)
                postBuyOrder(
                  pairInfo.pair,
                  pairInfo.buyCoin,
                  candle.closePrice,
                  percentage
                );
            };

            const closePosition = (side, percentage) => {
              if (pairInfo)
                postSellOrder(
                  pairInfo.pair,
                  pairInfo.sellCoin,
                  candle.closePrice,
                  percentage
                );
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
    } else if (data.topic === "execution") {
      if (data.data.length > 0) notifyExecutionUpdate(data.data[0]);
    } else if (data.topic === "order") {
      if (data.data.length > 0) notifyOrderUpdate(data.data[0]);
    } else if (data.topic === "wallet") {
      if (data.data.length > 0) notifyWalletUpdate(data.data[0]);
    }
  });

  wsClient.subscribeV5([...topics, "order", "execution", "wallet"], "spot");
}

module.exports = { startTradingBot };
