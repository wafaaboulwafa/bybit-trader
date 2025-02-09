const stopLossRatio: number = 2;
const takeProfitRatio: number = 1;

const highTimeframe = "15"; //15 minute
const lowTimeframe = "5"; //5 Minutes

import { OnStrategyType } from "../service/types";
import { getAtr, getLastValue } from "../service/indicators";
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

interface TimeFrameAnalysesType {
  highFastMa: number | undefined;
  highSlowMa: number | undefined;
  highDirection: "Up" | "Down" | undefined;

  lowFastMa: number | undefined;
  lowSlowMa: number | undefined;
  lowDirection: "Up" | "Down" | undefined;

  previousTrend: "Up" | "Down" | "None" | undefined;
  trend: "Up" | "Down" | "None" | undefined;

  crossFastMa: number | undefined;
  crossSlowMa: number | undefined;

  previousMaCross: "Over" | "Under" | undefined;
  currentMaCross: "Over" | "Under" | undefined;

  isBuy: boolean;
  isSell: boolean;
}

const pairAnalyses = new Map<string, TimeFrameAnalysesType>();

const calcHighTimeFrameAnalyses = (
  pair: string,
  level: "high" | "low",
  prices: number[]
) => {
  const analyses: TimeFrameAnalysesType = pairAnalyses.get(pair) || {
    previousTrend: undefined,
    trend: undefined,
    highFastMa: undefined,
    highSlowMa: undefined,
    highDirection: undefined,
    lowFastMa: undefined,
    lowSlowMa: undefined,
    lowDirection: undefined,
    crossFastMa: undefined,
    crossSlowMa: undefined,
    previousMaCross: undefined,
    currentMaCross: undefined,
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
    analyses.lowFastMa === undefined ||
    analyses.lowSlowMa === undefined ||
    analyses.crossFastMa === undefined ||
    analyses.crossSlowMa === undefined
  )
    return;

  //Trend direction change
  let trend: "Down" | "Up" | "None" = "None";
  let trendChanged = false;

  if (analyses.highDirection === "Down") trend = "Down";
  else if (analyses.highDirection === "Up") trend = "Up";

  if (trend != analyses.trend) {
    if (analyses.trend) trendChanged = true;
    analyses.previousTrend = analyses.trend;
    analyses.trend = trend;
  }

  //Price direction change
  let currentMaCross: "Over" | "Under" | undefined;
  let priceDirectionChanged = false;

  if (analyses.crossFastMa > analyses.crossSlowMa) currentMaCross = "Over";
  else if (analyses.crossFastMa < analyses.crossSlowMa)
    currentMaCross = "Under";

  if (currentMaCross && currentMaCross !== analyses.currentMaCross) {
    if (analyses.currentMaCross) priceDirectionChanged = true;
    analyses.previousMaCross = analyses.currentMaCross;
    analyses.currentMaCross = currentMaCross;
  }

  analyses.isSell =
    analyses.trend === "Down" &&
    analyses.lowDirection === "Up" &&
    analyses.currentMaCross === "Under";

  analyses.isBuy =
    analyses.trend === "Up" &&
    analyses.lowDirection === "Down" &&
    analyses.currentMaCross === "Over";

  /*
  if (trendChanged || priceDirectionChanged || candleCrossChanged) {
    console.log(analyses);
  }
  */

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
  ) => Promise<void>,
  closeBuyPosition: (price: number) => Promise<void>,
  closeSellPosition: (price: number) => Promise<void>
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
    await closeSellPosition(0);

    const stopLoss = price - atr * stopLossRatio;
    const takeProfit = price + atr * takeProfitRatio;

    if (
      price &&
      stopLoss &&
      takeProfit &&
      takeProfit > price &&
      price > stopLoss
    )
      await buyPosition(price, takeProfit, stopLoss);
  }

  if (analyses.isSell && !hasSellPositions && !isSellTriggered(pair)) {
    //Sell signal
    setSellTriggered(pair);
    console.log(`Sell signal on ${pair} at price: ${price}`);
    await closeBuyPosition(0);

    const stopLoss = price + atr * stopLossRatio;
    const takeProfit = price - atr * takeProfitRatio;
    if (
      price &&
      stopLoss &&
      takeProfit &&
      stopLoss > price &&
      price > takeProfit
    )
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

  const timeFrameRepo = pairData.getTimeFrame(timeFrame);
  if (!timeFrameRepo) return;

  const prices = timeFrameRepo?.ohlc4 || [];
  if (prices.length < 3) return;

  if (timeFrame === highTimeframe) {
    calcHighTimeFrameAnalyses(pair, "high", prices);
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
        sellPosition,
        closeBuyPosition,
        closeSellPostion
      );
      clearPairProcessing(pair);
    }
  }
};

export default strategy;
