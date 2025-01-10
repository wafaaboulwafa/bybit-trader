require("dotenv").config();

import startTradingBot from "./tradingBot";
import backtestTradingBot from "./backtest";
import startHttpServer from "./tradingViewNotify";
import BacktestRepo from "../repository/backtestRepo";

//Run backtest
const isBacktest =
  process.argv.findIndex((r: string) => r === "--backtest") > -1;

//Generate backtest market info files
const isGenerateBacktestMarketData =
  process.argv.findIndex((r: string) => r === "--generatebacktestdata") > -1;

if (isGenerateBacktestMarketData) {
  //Generate backtest info
  BacktestRepo.generateBacktestFile();
} else if (isBacktest) {
  // Run backtest emulator
  backtestTradingBot();
} else {
  // Run socket bot
  startTradingBot();
  startHttpServer();
}
