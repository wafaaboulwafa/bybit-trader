import { loadPairSpotMarketCandles } from "./tradingApi";
import { getClosePrices } from "./indicators";
import { DateTime } from "luxon";
import fs from "fs";
import { MarketDataType, OnUpdateType } from "./types";

export async function startTradingBot(onUpdate: OnUpdateType) {
  const marketCandles:MarketDataType; 
  await deseralizeMarketDataFiles(marketCandles);

  const assets = {
    USD: 1000,
  };

  //Starting assets
  console.log(assets);

  for (let pair of marketCandles) {
    const candles = candles;

    for (let candle of candles) {
        const closePrices = getClosePrices(candles);

        const buyPosition = (percentage: number) => {};

        const sellPosition = (percentage: number) => {
          //
        };

        const closePositions = () => {
          //
        };

        if (onUpdate) {
          onUpdate(
          pairName: string,
          timeFrame: number,
          candles: CandleType[],
          closePrices: number[],
          closePrice: number,
          candle: CandleType,
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

export async function seralizeMarketDataFiles() {
  const data = [];

  for (const pair of pairs) {
    const candlesSet = new Map();
    await loadPairSpotMarketCandles(candlesSet);
    candles = Array.from(candlesSet.values());
    data.push({ pair, candles });
  }

  const filePath = "./constants/backtestData.json";

  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  const jsonString = JSON.stringify(data, null, 2);
  await fs.writeFileSync(filePath, jsonString, {});
}

async function deseralizeMarketDataFiles(marketCandles:MarketDataType) {
  const marketData = require("../../constants/backtestData.json");
  marketCandles.set(marketData);
}
