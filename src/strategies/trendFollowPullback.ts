/*
trend-following with or without pullback strategy
Strategy allow to use strong trends.
*/

import { OnStrategyType } from "../service/types";
import {
  calcEma,
  getAtr,
  getLastValue,
  getTrendDirection,
} from "../service/indicators";
import PairRepo from "../repository/pairRepo";
import { sma } from "technicalindicators";
import {
  clearBuyTrigger,
  clearPairProcessing,
  clearSellTrigger,
  isBuyTriggered,
  isPairUnderProcessing,
  isSellTriggered,
  setBuyTriggered,
  setPairUnderProcessing,
  setSellTriggered,
} from "../repository/tradeProcessing";

const stopLossRatio: number = 4;
const takeProfitRatio: number = stopLossRatio * 4;
const waitForRebounce: boolean = true;

interface TimeFrameAnalysesType {
  highFastMa: number | undefined;
  highSlowMa: number | undefined;
  highDirection: "Up" | "Down" | undefined;

  midFastMa: number | undefined;
  midSlowMa: number | undefined;
  midDirection: "Up" | "Down" | undefined;

  lowFastMa: number | undefined;
  lowSlowMa: number | undefined;
  lowDirection: "Up" | "Down" | undefined;

  trend: "Up" | "Down" | "None";

  crossFastMa: number | undefined;
  crossSlowMa: number | undefined;

  previousMaCross: "Over" | "Under" | undefined;
  currentMaCross: "Over" | "Under" | undefined;

  previousCandleCross: "Over" | "Under" | undefined;
  currentCandlCross: "Over" | "Under" | undefined;

  isBuy: boolean;
  isSell: boolean;
}

const pairAnalyses = new Map<string, TimeFrameAnalysesType>();

const calcHighTimeFrameAnalyses = (
  pair: string,
  level: "high" | "mid" | "low",
  prices: number[]
) => {
  const analyses: TimeFrameAnalysesType = pairAnalyses.get(pair) || {
    trend: "None",
    highFastMa: undefined,
    highSlowMa: undefined,
    highDirection: undefined,
    midFastMa: undefined,
    midSlowMa: undefined,
    midDirection: undefined,
    lowFastMa: undefined,
    lowSlowMa: undefined,
    lowDirection: undefined,
    crossFastMa: undefined,
    crossSlowMa: undefined,
    previousMaCross: undefined,
    currentMaCross: undefined,
    previousCandleCross: undefined,
    currentCandlCross: undefined,
    isBuy: false,
    isSell: false,
  };

  const fastMaArray = sma({ values: prices, period: 15 });
  const slowMaArray = sma({ values: prices, period: 20 });

  const lastFast = getLastValue(fastMaArray);
  const lastSlow = getLastValue(slowMaArray);

  if (!lastFast || !lastSlow) return;

  let direction: "Up" | "Down" | undefined = undefined;

  if (lastFast > lastSlow) direction = "Up";
  else if (lastFast < lastSlow) direction = "Down";

  if (level === "high") {
    analyses.highFastMa = lastFast;
    analyses.highSlowMa = lastSlow;
    analyses.highDirection = direction;
  } else if (level === "mid") {
    analyses.midFastMa = lastFast;
    analyses.midSlowMa = lastSlow;
    analyses.midDirection = direction;
  } else if (level === "low") {
    analyses.lowFastMa = lastFast;
    analyses.lowSlowMa = lastSlow;
    analyses.lowDirection = direction;

    const crossFastMaArray = sma({ values: prices, period: 1 });
    const crossSlowMaArray = sma({ values: prices, period: 3 });

    analyses.crossFastMa = getLastValue(crossFastMaArray);
    analyses.crossSlowMa = getLastValue(crossSlowMaArray);
  }

  pairAnalyses.set(pair, analyses);
};

const calcLowTimeFrameAnalyses = (
  price: number,
  pair: string,
  prices: number[],
  pairData: PairRepo,
  lowtimeFrame: string
) => {
  const timeFrameRepo = pairData.getTimeFrame(lowtimeFrame);
  if (!timeFrameRepo) return;

  const analyses = pairAnalyses.get(pair);

  //Wait for high timeframe analyses
  if (
    analyses === undefined ||
    analyses.highFastMa === undefined ||
    analyses.highSlowMa === undefined ||
    analyses.midFastMa === undefined ||
    analyses.midSlowMa === undefined ||
    analyses.lowFastMa === undefined ||
    analyses.lowSlowMa === undefined ||
    analyses.crossFastMa === undefined ||
    analyses.crossSlowMa === undefined
  )
    return;

  if (analyses.highDirection === "Down" && analyses.midDirection === "Down")
    analyses.trend = "Down";
  else if (analyses.highDirection === "Up" && analyses.midDirection === "Up")
    analyses.trend = "Up";
  else analyses.trend = "None";

  //Price direction change
  let currentMaCross: "Over" | "Under" | undefined;
  let priceDirectionChanged = false;

  if (analyses.crossFastMa && analyses.crossSlowMa) {
    if (analyses.crossFastMa > analyses.crossSlowMa) currentMaCross = "Over";
    else if (analyses.crossFastMa < analyses.crossSlowMa)
      currentMaCross = "Under";

    if (currentMaCross && currentMaCross !== analyses.currentMaCross) {
      if (analyses.currentMaCross) priceDirectionChanged = true;
      analyses.previousMaCross = analyses.currentMaCross;
      analyses.currentMaCross = currentMaCross;
    }
  }

  //Candle crossing change
  let currentCandleCross: "Over" | "Under" | undefined = undefined;
  let candleCrossChanged = false;

  const prevCandle = timeFrameRepo.candle[2];
  const currentCandle = timeFrameRepo.candle[1];

  if (
    prevCandle.openPrice > analyses.lowFastMa &&
    analyses.lowFastMa > currentCandle.closePrice
  ) {
    currentCandleCross = "Under";
  } else if (
    prevCandle.openPrice < analyses.lowFastMa &&
    analyses.lowFastMa < currentCandle.closePrice
  ) {
    currentCandleCross = "Over";
  }

  if (currentCandleCross && currentCandleCross !== analyses.currentCandlCross) {
    if (analyses.currentCandlCross) candleCrossChanged = true;
    analyses.previousCandleCross = analyses.currentCandlCross;
    analyses.currentCandlCross = currentCandleCross;
  }

  if (!waitForRebounce) {
    if (
      analyses.trend === "Up" &&
      analyses.lowDirection === "Up" &&
      analyses.currentMaCross === "Over"
    ) {
      analyses.isBuy = true;
      analyses.isSell = false;
    }

    if (
      analyses.trend === "Down" &&
      analyses.lowDirection === "Down" &&
      analyses.currentMaCross === "Under"
    ) {
      analyses.isBuy = false;
      analyses.isSell = true;
    }
  } else {
    if (
      candleCrossChanged &&
      analyses.trend === "Up" &&
      analyses.currentCandlCross === "Over"
    ) {
      analyses.isBuy = true;
      analyses.isSell = false;
    }

    if (
      candleCrossChanged &&
      analyses.trend === "Down" &&
      analyses.currentCandlCross === "Under"
    ) {
      analyses.isBuy = false;
      analyses.isSell = true;
    }
  }

  pairAnalyses.set(pair, analyses);
};

const checkTrades = async (
  pair: string,
  analyses: TimeFrameAnalysesType,
  pairData: PairRepo,
  lowtimeFrame: string,
  price: number,
  hasBuyPositions: boolean,
  hasSellPositions: boolean,
  buyPosition: (
    price: number,
    takeProfit: number,
    stopLoss: number
  ) => Promise<void>,
  sellPosition: (
    price: number,
    takeProfit: number,
    stopLoss: number
  ) => Promise<void>
) => {
  const timeFrameRepo = pairData.getTimeFrame(lowtimeFrame);
  if (!timeFrameRepo) return;

  const atr = getAtr(timeFrameRepo.candle, 14);
  if (!atr) return;

  //Any previous open positions
  if (hasBuyPositions || hasSellPositions) {
    clearSellTrigger(pair);
    clearBuyTrigger(pair);
  }

  if (analyses.isBuy && !hasBuyPositions && !isBuyTriggered(pair)) {
    //Buy signal
    setBuyTriggered(pair);
    console.log(`Buy signal on ${pair} at price: ${price}`);

    const stopLoss = price - atr * stopLossRatio;
    const takeProfit = price + atr * takeProfitRatio;
    await buyPosition(price, takeProfit, stopLoss);
  }

  if (analyses.isSell && !hasSellPositions && !isSellTriggered(pair)) {
    //Sell signal
    setSellTriggered(pair);
    console.log(`Sell signal on ${pair} at price: ${price}`);

    const stopLoss = price + atr * stopLossRatio;
    const takeProfit = price - atr * takeProfitRatio;
    await sellPosition(price, takeProfit, stopLoss);
  }
};

const strategy: OnStrategyType = async (
  pair,
  timeFrame,
  price,
  candle,
  buyPosition,
  sellPosition,
  closeBuyPosition,
  closeSellPostion,
  pairData,
  hasSellPositions,
  hasBuyPositions
) => {
  if (price === 0) return;

  //Three Guitar lines to identify the trend
  const highTimeframe = "30"; //30 minute
  const midTimeframe = "15"; //15 minute
  const lowTimeframe = "5"; //5 Minutes

  const timeFrameRepo = pairData.getTimeFrame(timeFrame);
  if (!timeFrameRepo) return;

  const prices = timeFrameRepo?.ohlc4 || [];
  if (prices.length < 100) return;

  if (timeFrame === highTimeframe) {
    calcHighTimeFrameAnalyses(pair, "high", prices);
  } else if (timeFrame === midTimeframe) {
    calcHighTimeFrameAnalyses(pair, "mid", prices);
  } else if (timeFrame === lowTimeframe) {
    calcHighTimeFrameAnalyses(pair, "low", prices);
    //Low timeframe analysis
    calcLowTimeFrameAnalyses(price, pair, prices, pairData, lowTimeframe);
  }

  //Check for trade signals
  if (timeFrame === lowTimeframe && !isPairUnderProcessing(pair)) {
    const analyses = pairAnalyses.get(pair);
    if (analyses) {
      setPairUnderProcessing(pair);
      checkTrades(
        pair,
        analyses,
        pairData,
        timeFrame,
        price,
        hasBuyPositions,
        hasSellPositions,
        buyPosition,
        sellPosition
      );
      clearPairProcessing(pair);
    }
  }
};

export default strategy;
