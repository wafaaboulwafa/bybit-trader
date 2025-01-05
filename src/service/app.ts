require("dotenv").config();

import startTradingBot from "./tradingBot";
import backtestTradingBot, { seralizeMarketDataFiles } from "./backtest";

//Strategy method
//import rsiEmaCrossStrategy from "../strategies/RsiEMACross";
import emaCrossStrategy from "../strategies/emaCross";

const strategy = emaCrossStrategy;

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
  backtestTradingBot(strategy);
} else {
  // Run socket bot
  startTradingBot(strategy);
}
