import { sma } from "technicalindicators";
import { getLastValue, getTrendDirection } from "../service/indicators";
import { OnStrategyType } from "../service/types";
import { notifyTelegram } from "../service/telgramClient";

type WychoffPhaseType =
  | "Mark-up"
  | "Mark-down"
  | "Accumulation"
  | "Distribution"
  | "Consolidation"
  | "Hold-long"
  | "Hold-short";

interface WychoffAnalysesType {
  highTrend: "Uptrend" | "Downtrend" | "Sideways" | undefined;
  highFastSma: number | undefined;
  highSlowSma: number | undefined;
  lowFastSma: number | undefined;
  lowSlowSma: number | undefined;
  crossFastSma: number | undefined;
  crossSlowSma: number | undefined;
  wychoffPahse: WychoffPhaseType | undefined;
  isBuy: boolean;
  isSell: boolean;
  closeBuy: boolean;
  closeSell: boolean;
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
    isBuy: false,
    isSell: false,
    closeBuy: false,
    closeSell: false,
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

  if (
    price >= Math.min(analyses.highFastSma, analyses.highSlowSma) &&
    price <= Math.max(analyses.highFastSma, analyses.highSlowSma)
  ) {
    analyses.wychoffPahse = "Consolidation";
  } else if (
    analyses.lowFastSma > analyses.lowSlowSma &&
    analyses.lowFastSma > analyses.highFastSma &&
    price > analyses.lowFastSma
  ) {
    analyses.wychoffPahse = "Mark-up";
  } else if (
    analyses.lowFastSma < analyses.lowSlowSma &&
    analyses.lowFastSma < analyses.highFastSma &&
    price < analyses.lowFastSma
  ) {
    analyses.wychoffPahse = "Mark-down";
  } else if (
    analyses.lowFastSma < analyses.lowSlowSma &&
    analyses.lowFastSma > analyses.highFastSma &&
    price < analyses.lowFastSma
  ) {
    analyses.wychoffPahse = "Hold-short";
  } else if (
    analyses.lowFastSma > analyses.lowSlowSma &&
    analyses.lowFastSma < analyses.highFastSma &&
    price > analyses.lowFastSma
  ) {
    analyses.wychoffPahse = "Hold-long";
  } else if (
    price <= analyses.lowFastSma &&
    analyses.lowFastSma > analyses.highFastSma
  ) {
    analyses.wychoffPahse = "Distribution";
  } else if (
    price >= analyses.lowFastSma &&
    analyses.lowFastSma < analyses.highFastSma
  ) {
    analyses.wychoffPahse = "Accumulation";
  } else analyses.wychoffPahse = undefined;

  pairAnalyses.set(pair, analyses);
};

const prevState = new Map<string, string>();

const notifyChange = (pair: string) => {
  const analyses = pairAnalyses.get(pair);
  if (!analyses || !analyses.wychoffPahse) return;

  const prevWycoffState = prevState.get(pair);
  const changed = !prevWycoffState || prevWycoffState !== analyses.wychoffPahse;

  if (changed) {
    const msg = pair + ":" + analyses.wychoffPahse;
    notifyTelegram(msg);
    console.log(msg);
    prevState.set(pair, analyses.wychoffPahse);
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
  const lowTimeframe = "5"; //5 Minutes

  const isSmallTimeframe = timeFrame === lowTimeframe;
  const isLargeTimeframe = timeFrame === highTimeframe;

  if (!isSmallTimeframe && !isLargeTimeframe) return;

  const prices = timeFrameRepo?.ohlc4 || [];
  if (prices.length < 100) return;

  if (isLargeTimeframe) {
    //High timeframe analysis
    highTimeframeAnalysis(pair, prices);
  } else if (isSmallTimeframe) {
    //Low timeframe analysis
    lowTimeframeAnalysis(pair, price, prices);
    notifyChange(pair);
  }
};

export default strategy;
