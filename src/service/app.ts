require("dotenv").config();
import startTradingBot from "./tradingBot";
//import startTradingBot: backtestTradingBot , { seralizeMarketDataFiles } from "./backtest";

//Strategy method
import RsiEmaCrossStrategy from "../strategies/RsiEMACross";

//Run backtest
const isBacktest = process.argv.findIndex((r) => r === "--backtest") > -1;

//Generate backtest market info files
const isGenerateBacktestMarketData =
  process.argv.findIndex((r) => r === "--generatebacktestdata") > -1;

// Run socket bot
startTradingBot(RsiEmaCrossStrategy);

/*
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
*/
