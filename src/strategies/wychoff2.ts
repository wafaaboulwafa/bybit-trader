import { sma } from "technicalindicators";
import { getLastValue } from "../service/indicators";
import { OnStrategyType } from "../service/types";

type WychoffPhaseType =
  | "Mark-up"
  | "Mark-down"
  | "Accumulation"
  | "Distribution"
  | "Consolidation";

interface WychoffAnalysesType {
  highFastSma: number | undefined;
  highSlowSma: number | undefined;
  lowFastSma: number | undefined;
  lowSlowSma: number | undefined;
  crossFastSma: number | undefined;
  crossSlowSma: number | undefined;
  wychoffPahse: WychoffPhaseType | undefined;
}

const pairAnalyses = new Map<string, WychoffAnalysesType>();

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

    //Collect info
    const analyses: WychoffAnalysesType = pairAnalyses.get(pair) || {
      highFastSma: undefined,
      highSlowSma: undefined,
      lowFastSma: undefined,
      lowSlowSma: undefined,
      crossFastSma: undefined,
      crossSlowSma: undefined,
    };

    const fastMaArray = sma({ values: prices, period: 15 });
    const slowMaArray = sma({ values: prices, period: 20 });

    analyses.highFastSma = getLastValue(fastMaArray);
    analyses.highSlowSma = getLastValue(slowMaArray);

    pairAnalyses.set(pair, analyses);
  } else if (isSmallTimeframe) {
    //Low timeframe analysis
    const analyses = pairAnalyses.get(pair);
    if (analyses === undefined) return;

    //Collect info
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

    ////
    //Analyse
    if (
      price >= Math.min(analyses.highFastSma, analyses.highSlowSma) &&
      price <= Math.max(analyses.highFastSma, analyses.highSlowSma)
    ) {
      analyses.wychoffPahse = "Consolidation";
    } else if (
      analyses.lowFastSma > analyses.lowSlowSma &&
      analyses.lowFastSma > analyses.highFastSma
    ) {
      analyses.wychoffPahse = "Mark-up";
    } else if (
      analyses.lowFastSma < analyses.lowSlowSma &&
      analyses.lowFastSma < analyses.highFastSma
    ) {
      analyses.wychoffPahse = "Mark-down";
    } else if (
      analyses.lowFastSma > analyses.lowSlowSma &&
      analyses.lowFastSma < analyses.highFastSma
    ) {
      analyses.wychoffPahse = "Accumulation";
    } else if (
      analyses.lowFastSma < analyses.lowSlowSma &&
      analyses.lowFastSma > analyses.highFastSma
    ) {
      analyses.wychoffPahse = "Distribution";
    }
    //

    pairAnalyses.set(pair, analyses);
  }
};

export default strategy;
