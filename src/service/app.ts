require("dotenv").config();

import startTradingBot from "./tradingBot";
import backtestTradingBot, { seralizeMarketDataFiles } from "./backtest";

//Run backtest
const isBacktest =
  process.argv.findIndex((r: string) => r === "--backtest") > -1;

//Generate backtest market info files
const isGenerateBacktestMarketData =
  process.argv.findIndex((r: string) => r === "--generatebacktestdata") > -1;

if (isGenerateBacktestMarketData) {
  //Generate backtest info
  seralizeMarketDataFiles();
} else if (isBacktest) {
  // Run backtest emulator
  backtestTradingBot();
} else {
  // Run socket bot
  startTradingBot();
}
