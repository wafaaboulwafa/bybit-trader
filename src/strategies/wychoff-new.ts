import { sma } from "technicalindicators";
import { getAtr, getLastValue, getTrendDirection } from "../service/indicators";
import { OnStrategyType } from "../service/types";
import { notifyTelegram } from "../service/telgramClient";
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
import PairRepo from "../repository/pairRepo";

const stopLossRatio: number = 3;
const takeProfitRatio: number = stopLossRatio * 3;

type WychoffPhaseType =
  | "Mark-up"
  | "Mark-down"
  | "Accumulation"
  | "Distribution"
  | "Consolidation";

interface WychoffAnalysesType {
  highTrend: "Uptrend" | "Downtrend" | "Sideways" | undefined;
  highFastSma: number | undefined;
  highSlowSma: number | undefined;
  midHighFastSma: number | undefined;
  midHighSlowSma: number | undefined;
  middleFastSma: number | undefined;
  middleSlowSma: number | undefined;
  midLowFastSma: number | undefined;
  midLowSlowSma: number | undefined;
  lowFastSma: number | undefined;
  lowSlowSma: number | undefined;
  crossFastSma: number | undefined;
  crossSlowSma: number | undefined;
  previousCross: "Up" | "Down" | undefined;
  currentCross: "Up" | "Down" | undefined;
  wychoffPahse: WychoffPhaseType | undefined;
  prevousWychoffPahse: WychoffPhaseType | undefined;
  isSell: boolean;
  isBuy: boolean;
}

const pairAnalyses = new Map<string, WychoffAnalysesType>();

const highTimeframeAnalysis = (
  pair: string,
  level: "high" | "midHigh" | "middle" | "midLow" | "low",
  prices: number[]
) => {
  const analyses: WychoffAnalysesType = pairAnalyses.get(pair) || {
    highTrend: undefined,
    highFastSma: undefined,
    highSlowSma: undefined,
    midHighFastSma: undefined,
    midHighSlowSma: undefined,
    middleFastSma: undefined,
    middleSlowSma: undefined,
    midLowFastSma: undefined,
    midLowSlowSma: undefined,
    lowFastSma: undefined,
    lowSlowSma: undefined,
    crossFastSma: undefined,
    crossSlowSma: undefined,
    wychoffPahse: undefined,
    prevousWychoffPahse: undefined,
    isSell: false,
    isBuy: false,
    previousCross: undefined,
    currentCross: undefined,
  };

  const fastMaArray = sma({ values: prices, period: 15 });
  const slowMaArray = sma({ values: prices, period: 20 });

  if (level === "high") analyses.highTrend = getTrendDirection(slowMaArray);

  const lastFast = getLastValue(fastMaArray);
  const lastSlow = getLastValue(slowMaArray);

  if (level === "high") {
    analyses.highFastSma = lastFast;
    analyses.highSlowSma = lastSlow;
  } else if (level === "midHigh") {
    analyses.midHighFastSma = lastFast;
    analyses.midHighSlowSma = lastSlow;
  } else if (level === "middle") {
    analyses.middleFastSma = lastFast;
    analyses.middleSlowSma = lastSlow;
  } else if (level === "midLow") {
    analyses.midLowFastSma = lastFast;
    analyses.midLowSlowSma = lastSlow;
  } else if (level === "low") {
    analyses.lowFastSma = lastFast;
    analyses.lowSlowSma = lastSlow;

    const crossFastMaArray = sma({ values: prices, period: 1 });
    const crossSlowMaArray = sma({ values: prices, period: 3 });

    analyses.crossFastSma = getLastValue(crossFastMaArray);
    analyses.crossSlowSma = getLastValue(crossSlowMaArray);
  }

  pairAnalyses.set(pair, analyses);
};

const lowTimeframeAnalysis = (
  pair: string,
  price: number,
  prices: number[]
) => {
  const analyses = pairAnalyses.get(pair);
  if (analyses === undefined) return;

  if (
    !analyses.highFastSma ||
    !analyses.highSlowSma ||
    !analyses.midHighFastSma ||
    !analyses.midHighSlowSma ||
    !analyses.middleFastSma ||
    !analyses.middleSlowSma ||
    !analyses.midLowFastSma ||
    !analyses.midLowSlowSma ||
    !analyses.lowFastSma ||
    !analyses.lowSlowSma ||
    !analyses.crossFastSma ||
    !analyses.crossSlowSma
  )
    return;

  let wychoffPahse: WychoffPhaseType | undefined = undefined;

  if (
    price >= Math.min(analyses.highFastSma, analyses.highSlowSma) &&
    price <= Math.max(analyses.highFastSma, analyses.highSlowSma)
  ) {
    wychoffPahse = "Consolidation";
  } else if (
    analyses.lowFastSma > analyses.lowSlowSma &&
    analyses.lowFastSma > analyses.highFastSma &&
    price > analyses.lowFastSma
  ) {
    wychoffPahse = "Mark-up";
  } else if (
    analyses.lowFastSma < analyses.lowSlowSma &&
    analyses.lowFastSma < analyses.highFastSma &&
    price < analyses.lowFastSma
  ) {
    wychoffPahse = "Mark-down";
  } else if (
    analyses.lowFastSma < analyses.lowSlowSma &&
    analyses.lowFastSma > analyses.highFastSma &&
    price < analyses.lowFastSma
  ) {
    wychoffPahse = "Mark-down";
  } else if (
    analyses.lowFastSma > analyses.lowSlowSma &&
    analyses.lowFastSma < analyses.highFastSma &&
    price > analyses.lowFastSma
  ) {
    wychoffPahse = "Mark-up";
  } else if (
    price <= analyses.lowFastSma &&
    analyses.lowFastSma > analyses.highFastSma
  ) {
    wychoffPahse = "Distribution";
  } else if (
    price >= analyses.lowFastSma &&
    analyses.lowFastSma < analyses.highFastSma
  ) {
    wychoffPahse = "Accumulation";
  }

  //Wychoff phase change
  if (wychoffPahse && wychoffPahse !== analyses.wychoffPahse) {
    if (analyses.wychoffPahse)
      analyses.prevousWychoffPahse = analyses.wychoffPahse;
    analyses.wychoffPahse = wychoffPahse;

    const msg = pair + ": " + analyses.wychoffPahse;
    notifyTelegram(msg);
    console.log(msg);
  }

  //Cross direction change
  let currentCross: "Up" | "Down" | undefined;
  let priceDirectionChanges = false;

  if (analyses.crossFastSma && analyses.crossSlowSma) {
    if (analyses.crossFastSma > analyses.crossSlowSma) currentCross = "Up";
    else if (analyses.crossFastSma < analyses.crossSlowSma)
      currentCross = "Down";

    if (currentCross && currentCross !== analyses.currentCross) {
      if (analyses.currentCross) priceDirectionChanges = true;
      analyses.previousCross = analyses.currentCross;
      analyses.currentCross = currentCross;
    }
  }

  if (
    priceDirectionChanges &&
    analyses.currentCross === "Down" &&
    analyses.wychoffPahse === "Mark-down"
  ) {
    analyses.isSell = true;
    analyses.isBuy = false;
  } else if (
    priceDirectionChanges &&
    analyses.currentCross === "Up" &&
    analyses.wychoffPahse === "Mark-up"
  ) {
    analyses.isSell = false;
    analyses.isBuy = true;
  }

  pairAnalyses.set(pair, analyses);
};

const checkTrades = async (
  pair: string,
  analyses: WychoffAnalysesType,
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

const strategy: OnStrategyType = (
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
  const timeFrameRepo = pairData.getTimeFrame(timeFrame);
  if (!timeFrameRepo) return;

  if (price === 0) return;

  const highTimeframe = "240"; //4 hour
  const midHighTimeframe = "120"; //2 hour
  const midTimeframe = "60"; //1 hour
  const midLowTimeframe = "30"; //30 min hour
  const lowTimeframe = "5"; //5 Minutes

  const prices = timeFrameRepo?.ohlc4 || [];
  if (prices.length < 100) return;

  if (timeFrame === highTimeframe) {
    highTimeframeAnalysis(pair, "high", prices);
  } else if (timeFrame === midHighTimeframe) {
    highTimeframeAnalysis(pair, "midHigh", prices);
  } else if (timeFrame === midTimeframe) {
    highTimeframeAnalysis(pair, "middle", prices);
  } else if (timeFrame === midLowTimeframe) {
    highTimeframeAnalysis(pair, "midLow", prices);
  } else if (timeFrame === lowTimeframe) {
    highTimeframeAnalysis(pair, "low", prices);
    lowTimeframeAnalysis(pair, price, prices);
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
