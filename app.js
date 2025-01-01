const { startServer } = require("./server");
const {
  rsi,
  ema,
  sma,
  macd,
  bollingerbands,
  isEmaCrossUp,
  isEmaCrossDown,
} = require("./indicators");

function onNewCandle(pair, timeFrame, candles, closePrices) {
  console.log("data: ", JSON.stringify(data));
}

function onNewPrice(pair, price) {}

startServer(onNewCandle);
// Back test based on history kline
