require("dotenv").config();
import startTradingBot from "./tradingBot";
//import startTradingBot: backtestTradingBot , { seralizeMarketDataFiles } from "./backtest";

//Strategy method
import strategy from "../strategy/strategy";

//Run backtest
const isBacktest = process.argv.findIndex((r) => r === "--backtest") > -1;

//Generate backtest market info files
const isGenerateBacktestMarketData =
  process.argv.findIndex((r) => r === "--generatebacktestdata") > -1;

// Run socket bot
startTradingBot(strategy);

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
