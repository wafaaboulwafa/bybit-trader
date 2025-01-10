import {
  BacktestCandleType,
  BacktestDataType,
  BacktestTimeFrameType,
} from "../service/types";
import MarketRepo from "./marketRepo";
import fs from "fs";
import path from "path";

const backtestFilePath = "../../constants/backtestData.json";

class BacktestRepo {
  #backtestData: BacktestDataType = [];
  #queue: BacktestCandleType[] = [];

  constructor() {}

  init() {
    const filePath = path.resolve(__dirname, backtestFilePath);
    if (!fs.existsSync(filePath)) return undefined;
    this.#backtestData = require(filePath) as BacktestDataType;
  }

  rest() {
    this.#queue = [];

    for (let backtestPairData of this.#backtestData) {
      for (let backtestTimeframeData of backtestPairData.timeFrames) {
        for (let candle of backtestTimeframeData.data) {
          this.#queue.push({
            pairName: backtestPairData.pairName,
            timeFrame: backtestTimeframeData.timeFrame,
            candle,
          });
        }
      }
    }

    this.#queue.sort((a, b) => a.candle.key - b.candle.key);
  }

  get more(): boolean {
    return this.#queue.length > 0;
  }

  get nextCandle(): BacktestCandleType | undefined {
    if (this.#queue.length > 0) {
      const result = this.#queue[0];
      this.#queue.splice(0, 1);
      return result;
    }
  }

  static async generateBacktestFile() {
    const data: BacktestDataType = [];
    const marketRepo = new MarketRepo();
    marketRepo.init(false);

    for (const pairRepo of marketRepo.pairs) {
      const backtestPair = {
        pairName: pairRepo.pair,
        timeFrames: [] as BacktestTimeFrameType[],
      };

      for (const timeFrame of pairRepo.timeFrames) {
        const timeFrameRepo = pairRepo.getTimeFrame(timeFrame);
        timeFrameRepo?.loadPairBacktestHistoryCandles(pairRepo.pair, timeFrame);

        const backTestTimeFrame: BacktestTimeFrameType = {
          timeFrame: timeFrame,
          data: timeFrameRepo?.candle ? timeFrameRepo?.candle : [],
        };

        backtestPair.timeFrames.push(backTestTimeFrame);
      }
    }
    const filePath = path.resolve(__dirname, backtestFilePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    const jsonString = JSON.stringify(data, null, 2);
    await fs.writeFileSync(filePath, jsonString, { flush: true });

    console.log(`Saving load test data to file ${filePath}`);
  }
}

export default BacktestRepo;
