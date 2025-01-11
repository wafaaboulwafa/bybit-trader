require("dotenv").config();
import {
  marketLiveInstance,
  walletLiveInstance,
} from "../repository/instances";
import BacktestRepo from "../repository/backtestRepo";
import backtestTradingBot from "./../service/backtest";
import fs from "fs";
import path from "path";
import { BacktestDataType } from "../service/types";
import { saveBuffer } from "../service/misc";

function getCandles() {
  const backtestFilePath = "../../constants/backtestData.json";
  const filePath = path.resolve(__dirname, backtestFilePath);
  if (!fs.existsSync(filePath)) return undefined;
  const data = require(filePath) as BacktestDataType;
  return data;
}

setTimeout(async () => {
  //const pair = marketLiveInstance.getPair("DOGEUSDT");
  /*
  console.log(walletLiveInstance.getCoinAmount("USDT"));
  console.log(
    marketLiveInstance.getPair("DOGEUSDT")?.getTimeFrame("1")?.closePrice[0]
  );
*/
  //pair?.closeOpenFuturePositions();
  //pair?.cancelOrders();
  //pair?.postBuyOrder(0.33395, 0.1).then((r) => console.log(r));
  //pair?.postSellOrder(0.33623, 0.1).then((r) => console.log(r));
  //BacktestRepo.generateBacktestFile();

  const data = getCandles();
  if (data) {
    const candles = data[0].timeFrames[0].data;
  }
}, 1000 * 5);
