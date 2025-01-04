const { loadPairSpotMarketCandles } = require("./tradingApi");
const { getClosePrices } = require("./indicators");
const { DateTime } = require("luxon");
const fs = require("fs");

async function trade(pair, price, side, percentage = 1) {
  const balance = assets.balance;
  const buyAmount = balance * percentage;
  const qty = (buyAmount / price).toFixed(3);

  //update assets
}

async function startTradingBot(onUpdate) {
  const marketCandles = new Map();
  await deseralizeMarketDataFiles(marketCandles);

  const assets = {
    USD: 1000,
  };

  //Starting assets
  console.log(assets);

  for (let pair of marketCandles) {
    const candles = candles;

    for (let candle of candles) {
      if (onUpdate) {
        const closePrices = getClosePrices(candles);

        const openPosition = (side, percentage) => {
          trade(pairName, candle.closePrice, side, percentage);
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
  }

  //End assets
  console.log(assets);
}

async function seralizeMarketDataFiles() {
  const data = [];

  for (const pair of pairs) {
    const candlesSet = new Map();
    await loadPairSpotMarketCandles(candlesSet);
    candles = Array.from(candlesSet.values());
    data.push({ pair, candles });
  }

  const filePath = "./constants/backtestData.json";

  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  const jsonString = JSON.stringify(data, null, 2);
  await fs.writeFileSync(filePath, jsonString, {});
}

async function deseralizeMarketDataFiles(marketCandles) {
  const marketData = require("../constants/backtestData.json");
  marketCandles.set(marketData);
}

module.exports = { startTradingBot, seralizeMarketDataFiles };
