/*
Wychoff market analysis based on 4 hour
*/
const stopLossRatio: number = 3;
const takeProfitRatio: number = stopLossRatio * 3;

const highTimeframe = "240"; //4 hour
const lowTimeframe = "5"; //5 Minutes

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
  lowFastSma: number | undefined;
  lowSlowSma: number | undefined;
  crossFastSma: number | undefined;
  crossSlowSma: number | undefined;
  wychoffPahse: WychoffPhaseType | undefined;
  prevousWychoffPahse: WychoffPhaseType | undefined;
  isSell: boolean;
  isBuy: boolean;
}

const pairAnalyses = new Map<string, WychoffAnalysesType>();

const highTimeframeAnalysis = (pair: string, prices: number[]) => {
  const analyses: WychoffAnalysesType = pairAnalyses.get(pair) || {
    highTrend: undefined,
    highFastSma: undefined,
    highSlowSma: undefined,
    lowFastSma: undefined,
    lowSlowSma: undefined,
    crossFastSma: undefined,
    crossSlowSma: undefined,
    wychoffPahse: undefined,
    prevousWychoffPahse: undefined,
    isSell: false,
    isBuy: false,
  };

  const fastMaArray = sma({ values: prices, period: 15 });
  const slowMaArray = sma({ values: prices, period: 20 });
  analyses.highTrend = getTrendDirection(slowMaArray);
  analyses.highFastSma = getLastValue(fastMaArray);
  analyses.highSlowSma = getLastValue(slowMaArray);

  pairAnalyses.set(pair, analyses);
};

const lowTimeframeAnalysis = (
  pair: string,
  price: number,
  prices: number[]
) => {
  const analyses = pairAnalyses.get(pair);
  if (analyses === undefined) return;

  const fastMaArray = sma({ values: prices, period: 15 });
  const slowMaArray = sma({ values: prices, period: 20 });

  analyses.lowFastSma = getLastValue(fastMaArray);
  analyses.lowSlowSma = getLastValue(slowMaArray);

  const crossFastMaArray = sma({ values: prices, period: 1 });
  const crossSlowMaArray = sma({ values: prices, period: 3 });

  analyses.crossFastSma = getLastValue(crossFastMaArray);
  analyses.crossSlowSma = getLastValue(crossSlowMaArray);

  if (
    !analyses.highFastSma ||
    !analyses.highSlowSma ||
    !analyses.lowFastSma ||
    !analyses.lowSlowSma
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

  if (wychoffPahse && wychoffPahse !== analyses.wychoffPahse) {
    if (analyses.wychoffPahse)
      analyses.prevousWychoffPahse = analyses.wychoffPahse;
    analyses.wychoffPahse = wychoffPahse;

    const msg = pair + ": " + analyses.wychoffPahse;
    notifyTelegram(msg);
    console.log(msg);

    if (
      (analyses.prevousWychoffPahse === "Consolidation" ||
        analyses.prevousWychoffPahse === "Accumulation") &&
      analyses.wychoffPahse === "Mark-down"
    ) {
      analyses.isSell = true;
      analyses.isBuy = false;
    } else if (
      (analyses.prevousWychoffPahse === "Consolidation" ||
        analyses.prevousWychoffPahse === "Distribution") &&
      analyses.wychoffPahse === "Mark-up"
    ) {
      analyses.isSell = false;
      analyses.isBuy = true;
    }
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

  const isSmallTimeframe = timeFrame === lowTimeframe;
  const isLargeTimeframe = timeFrame === highTimeframe;

  if (!isSmallTimeframe && !isLargeTimeframe) return;

  const prices = timeFrameRepo?.ohlc4 || [];
  if (prices.length < 3) return;

  if (isLargeTimeframe) {
    //High timeframe analysis
    highTimeframeAnalysis(pair, prices);
  } else if (isSmallTimeframe) {
    //Low timeframe analysis
    lowTimeframeAnalysis(pair, price, prices);
  }

  //Check for trade signals
  if (isSmallTimeframe && !isPairUnderProcessing(pair)) {
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
