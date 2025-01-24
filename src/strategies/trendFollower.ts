import { OnStrategyType } from "../service/types";
import {
  analyzeTrendBySlope,
  calcEma,
  getLastValue,
} from "../service/indicators";
import { takeFirst, takeLast } from "../service/misc";
import PairRepo from "../repository/pairRepo";
import { sma } from "technicalindicators";

interface HighTimeFrameAnalysesType {
  trend:
    | "Uptrend"
    | "Downtrend"
    | "Sideways"
    | "StrongUptrend"
    | "StrongDowntrend"
    | undefined;
  crossState: "CrossUp" | "CrossDown" | undefined;
  fastMa: number;
  slowMa: number;
}

interface LowTimeFrameAnalysesType {
  crossState: "CrossUp" | "CrossDown" | undefined;
  touchedMa: boolean;
}

const highTimeFrameAnalyses = new Map<string, HighTimeFrameAnalysesType>();
const lowTimeFrameAnalyses = new Map<string, LowTimeFrameAnalysesType>();

const calcHighTimeFrameAnalyses = (pair: string, prices: number[]) => {
  const fastMaArray = sma({ values: prices, period: 15 });
  const slowMaArray = sma({ values: prices, period: 20 });

  const fastMa = getLastValue(fastMaArray);
  const slowMa = getLastValue(slowMaArray);

  if (!fastMa || !slowMa) return;

  const analyses: HighTimeFrameAnalysesType = highTimeFrameAnalyses.get(
    pair
  ) || {
    trend: undefined,
    crossState: undefined,
    fastMa: fastMa,
    slowMa: slowMa,
  };

  analyses.crossState =
    fastMa > slowMa ? "CrossUp" : slowMa > fastMa ? "CrossDown" : undefined;
  analyses.trend = analyzeTrendBySlope(takeLast(slowMaArray, 5, 0));
  analyses.fastMa = fastMa;
  analyses.slowMa = slowMa;

  highTimeFrameAnalyses.set(pair, analyses);
};

const calcLowTimeFrameAnalyses = (
  price: number,
  pair: string,
  prices: number[]
) => {
  const highTimeframeAnalyses: HighTimeFrameAnalysesType | undefined =
    highTimeFrameAnalyses.get(pair);

  if (
    highTimeframeAnalyses === undefined ||
    highTimeframeAnalyses.crossState === undefined ||
    highTimeframeAnalyses.trend === undefined ||
    highTimeframeAnalyses.trend === "Sideways"
  )
    return;

  const fastEma = calcEma(prices, 1);
  const slowEma = calcEma(prices, 2);

  if (!fastEma || !slowEma) return;

  const lowAnalyses: LowTimeFrameAnalysesType = lowTimeFrameAnalyses.get(
    pair
  ) || {
    crossState: undefined,
    touchedMa: false,
  };

  if (fastEma > slowEma) lowAnalyses.crossState = "CrossUp";
  if (fastEma < slowEma) lowAnalyses.crossState = "CrossDown";

  if (
    (highTimeframeAnalyses.trend === "StrongUptrend" ||
      highTimeframeAnalyses.trend === "Uptrend") &&
    highTimeframeAnalyses.crossState === "CrossUp" &&
    (price <= highTimeframeAnalyses.fastMa ||
      price <= highTimeframeAnalyses.slowMa)
  ) {
    lowAnalyses.touchedMa = true;
  }

  if (
    (highTimeframeAnalyses.trend === "StrongDowntrend" ||
      highTimeframeAnalyses.trend === "Downtrend") &&
    highTimeframeAnalyses.crossState === "CrossDown" &&
    (price >= highTimeframeAnalyses.fastMa ||
      price >= highTimeframeAnalyses.slowMa)
  ) {
    lowAnalyses.touchedMa = true;
  }

  lowTimeFrameAnalyses.set(pair, lowAnalyses);
};

const checkTrades = async (
  pair: string,
  pairData: PairRepo,
  lowtimeFrame: string,
  price: number,
  hasBuyPositions: boolean,
  hasSellPositions: boolean,
  buyPosition: (price: number, takeProfit: number, stopLoss: number) => void,
  sellPosition: (price: number, takeProfit: number, stopLoss: number) => void
) => {
  const timeFrameRepo = pairData.getTimeFrame(lowtimeFrame);
  if (!timeFrameRepo) return;

  const ht = highTimeFrameAnalyses.get(pair);
  const lt = lowTimeFrameAnalyses.get(pair);

  if (!ht || !lt || price === 0) return;

  const recentCandles = takeFirst(timeFrameRepo.candle, 3, 0);

  const htBuySignal =
    ht.crossState === "CrossUp" &&
    (ht.trend === "StrongUptrend" || ht.trend === "Uptrend");
  const htSellSignal =
    ht.crossState === "CrossDown" &&
    (ht.trend === "StrongDowntrend" || ht.trend === "Downtrend");

  const ltBuySignal = lt.touchedMa && lt.crossState === "CrossUp";
  const ltSellSignal = lt.touchedMa && lt.crossState === "CrossDown";
  const hasOpenPosition = hasBuyPositions || hasSellPositions;

  if (htBuySignal && ltBuySignal && !hasOpenPosition) {
    console.log(`Buy signal on ${pair} at price: ${price}`);
    const lowPrices = recentCandles.map((c) => c.lowPrice);
    const stopLoss = Math.min(...lowPrices);
    const points = price - stopLoss;
    const takeProfit = price + points * 2;
    await buyPosition(price, takeProfit, stopLoss);
    //console.log("Buy", { price, takeProfit, stopLoss });
  }

  if (htSellSignal && ltSellSignal && !hasOpenPosition) {
    console.log(`Sell signal on ${pair} at price: ${price}`);
    const highPrices = recentCandles.map((c) => c.highPrice);
    const stopLoss = Math.max(...highPrices);
    const points = stopLoss - price;
    const takeProfit = price - points * 2;
    await sellPosition(price, takeProfit, stopLoss);
    //console.log("Sell", { price, takeProfit, stopLoss });
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
  const isSmallTimeframe = timeFrame === "15";
  const isLargeTimeframe = timeFrame === "240"; //4 hour

  if (!isSmallTimeframe && !isLargeTimeframe) return;

  const timeFrameRepo = pairData.getTimeFrame(timeFrame);
  if (!timeFrameRepo) return;

  const prices = timeFrameRepo?.ohlc4 || [];
  if (prices.length < 100) return;

  if (isLargeTimeframe) {
    calcHighTimeFrameAnalyses(pair, prices);
  } else if (isSmallTimeframe) {
    calcLowTimeFrameAnalyses(price, pair, prices);
    checkTrades(
      pair,
      pairData,
      timeFrame,
      price,
      hasBuyPositions,
      hasSellPositions,
      buyPosition,
      sellPosition
    );
  }
};

export default strategy;
