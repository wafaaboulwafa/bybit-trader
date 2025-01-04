import { loadPairSpotMarketCandles } from "./tradingApi";
import fs from "fs";
import {
  CandleType,
  MarketDataType,
  OnUpdateType,
  PairConfigType,
} from "./types";

const pairs: PairConfigType[] = require("../../constants/config.json");

const startBalance = 1000;

async function startTradingBot(onUpdate: OnUpdateType) {
  const marketCandles = new Map<string, MarketDataType>();
  await deseralizeMarketDataFiles(marketCandles);

  const assets = {
    USD: startBalance,
  };

  //Starting assets
  console.log(assets);

  for (let pair of pairs) {
    const marketInfo = marketCandles.get(pair.pairName + "." + pair.timeFrame);

    const candles =
      (marketInfo?.candles && Array.from(marketInfo?.candles?.values())) || [];
    candles.sort((a, b) => b.key - a.key);
    const accumulatedCandles: CandleType[] = [];
    const accumulatedClosePrices: number[] = [];

    for (const candle of candles) {
      accumulatedCandles.push(candle);
      accumulatedClosePrices.push(candle.closePrice);

      const buyPosition = (percentage: number) => {};

      const sellPosition = (percentage: number) => {
        //
      };

      const closePositions = () => {
        //
      };

      if (onUpdate) {
        onUpdate(
          pair.pairName,
          pair.timeFrame,
          accumulatedCandles,
          accumulatedClosePrices,
          candle.closePrice,
          candle,
          buyPosition,
          sellPosition,
          closePositions
        );
      }
    }
  }

  //End assets
  console.log(assets);
}

const backtestFilePath = "./../../constants/backtestData.json";

export async function seralizeMarketDataFiles() {
  const data = [];

  for (const pair of pairs) {
    const candlesSet = new Map<number, CandleType>();
    await loadPairSpotMarketCandles(candlesSet, pair.pairName, pair.timeFrame);
    const candles = Array.from(candlesSet.values());
    data.push({ pair: pair.pairName, time: pair.timeFrame, candles });
  }

  if (fs.existsSync(backtestFilePath)) fs.unlinkSync(backtestFilePath);
  const jsonString = JSON.stringify(data, null, 2);
  await fs.writeFileSync(backtestFilePath, jsonString, {});
}

async function deseralizeMarketDataFiles(
  marketCandles: Map<string, MarketDataType>
) {
  if (!fs.existsSync(backtestFilePath)) return;

  marketCandles.clear();
  const fileContent = require(backtestFilePath);

  for (let pair of fileContent.entries()) {
    const marketInfo: MarketDataType = {
      name: pair?.name,
      time: parseInt(pair?.time),
      candles: new Map<number, CandleType>(),
    };

    for (let candle of pair.candles.entries()) {
      marketInfo.candles.set(candle.key, candle);
    }

    marketCandles.set(marketInfo.name, marketInfo);
  }
}

export default startTradingBot;
