const { loadSpotMarketCandles } = require("./tradingApi");
const { getClosePrices } = require("./indicators");

async function trade(pair, price, side, percentage = 1) {
  const balance = assets.balance;
  const buyAmount = balance * percentage;
  const qty = (buyAmount / price).toFixed(3);

  //update assets
}

async function startTradingBot(onUpdate) {
  const marketCandles = new Map();
  deseralizeMarketDataFiles(marketCandles);

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
  const marketCandles = new Map();
  await loadSpotMarketCandles(marketCandles);
}

async function deseralizeMarketDataFiles() {}

module.exports = { startTradingBot, seralizeMarketDataFiles };
