require("dotenv").config();
const { startTradingBot } = require("./tradingBot");
const {
  startTradingBot: backtestTradingBot,
  seralizeMarketDataFiles,
} = require("./backtest");

//Strategy method
const onUpdate = require("../strategy/strategy");

//Run backtest
const isBacktest = process.argv.findIndex((r) => r === "--backtest") > -1;

//Generate backtest market info files
const isGenerateBacktestMarketData =
  process.argv.findIndex((r) => r === "--generatebacktestdata") > -1;

if (isGenerateBacktestMarketData) {
  //Generate backtest info
  seralizeMarketDataFiles();
} else if (isBacktest) {
  // Run backtest emulator
  backtestTradingBot(onUpdate);
} else {
  // Run socket bot
  startTradingBot(onUpdate);
}
