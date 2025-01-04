require("dotenv").config();

import startTradingBot from "./tradingBot";
import backtestTradingBot, { seralizeMarketDataFiles } from "./backtest";

//Strategy method
import RsiEmaCrossStrategy from "../strategies/RsiEMACross";

const strategy = RsiEmaCrossStrategy;

//Run backtest
const isBacktest = process.argv.findIndex((r) => r === "--backtest") > -1;

//Generate backtest market info files
const isGenerateBacktestMarketData =
  process.argv.findIndex((r) => r === "--generatebacktestdata") > -1;

if (isGenerateBacktestMarketData) {
  //Generate backtest info
  seralizeMarketDataFiles();
}

if (isBacktest) {
  // Run backtest emulator
  backtestTradingBot(strategy);
} else {
  // Run socket bot
  startTradingBot(strategy);
}
