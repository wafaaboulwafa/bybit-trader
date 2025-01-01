const { startTradingBot } = require("./tradingBot");
const {
  rsi,
  ema,
  sma,
  macd,
  bollingerbands,
  isEmaCrossUp,
  isEmaCrossDown,
} = require("./indicators");

startTradingBot(
  (
    pair,
    timeFrame,
    candles,
    closePrices,
    closePrice,
    openPosition,
    closePosition
  ) => {
    const rsiValue = rsi(closePrices, 14);
    const macdValue = macd(closePrices);
    const crossUpValue = isEmaCrossUp(closePrices);
    const crossDownValue = isEmaCrossDown(closePrices);

    const buySignal = rsiValue < 30 && macdValue > 0 && crossUpValue;
    const sellSignal = rsiValue > 70 && macdValue < 0 && crossDownValue;

    if (buySignal) {
      closePosition("Sell", 1);
      openPosition("Buy", 0.25);
    }

    if (sellSignal) {
      closePosition("Buy", 1);
      openPosition("Sell", 0.25);
    }
  }
);
