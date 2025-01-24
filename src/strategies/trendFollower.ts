import { OnStrategyType } from "../service/types";
import { calcEma, calcSma } from "../service/indicators";
import { takeLast } from "../service/misc";
import PairRepo from "../repository/pairRepo";

function analyzeTrendBySlope(
  prices: number[]
): "Uptrend" | "Downtrend" | "Sideways" | "StrongUptrend" | "StrongDowntrend" {
  const mediumThreshold = 0.01;
  const strongThreshold = 0.05;

  if (!Array.isArray(prices) || prices.length < 2) {
    throw new Error("Input must be an array with at least two prices.");
  }

  // Calculate the slope using least squares regression
  const n = prices.length;
  const x = Array.from({ length: n }, (_, i) => i + 1); // x values: [1, 2, 3, ..., n]
  const sumX = x.reduce((sum, xi) => sum + xi, 0);
  const sumY = prices.reduce((sum, yi) => sum + yi, 0);
  const sumXY = prices.reduce((sum, yi, i) => sum + yi * x[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  // Calculate the slope (m)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // Determine trend based on slope and thresholds
  if (slope > strongThreshold) {
    return "StrongUptrend";
  } else if (slope > mediumThreshold) {
    return "StrongUptrend";
  } else if (slope < -strongThreshold) {
    return "StrongDowntrend";
  } else if (slope < -mediumThreshold) {
    return "Downtrend";
  } else {
    return "Sideways";
  }
}

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
  /*Find:
    MA cross
    trend direction
    trend strength
    high or low areas 
    */
  const fastMa = calcSma(prices, 15);
  const slowMa = calcSma(prices, 20);

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
  analyses.trend = analyzeTrendBySlope(prices);
  analyses.fastMa = fastMa;
  analyses.slowMa = slowMa;

  highTimeFrameAnalyses.set(pair, analyses);

  //Find last candle high and low and relative price
  //calculateZigZag()
};

const calcLowTimeFrameAnalyses = (
  price: number,
  pair: string,
  prices: number[]
) => {
  /*Find:
    Trade ratio 1 : 2
    Entry on touch of MA 20
    Top loss on last ziazag high
    TP based on ratio between last high and entry when EA cross
    Only take trade if no trades are open
    */
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
    highTimeframeAnalyses.trend === "StrongUptrend" &&
    highTimeframeAnalyses.crossState === "CrossUp" &&
    (price <= highTimeframeAnalyses.fastMa ||
      price <= highTimeframeAnalyses.slowMa)
  ) {
    lowAnalyses.touchedMa = true;
  }

  if (
    highTimeframeAnalyses.trend === "StrongDowntrend" &&
    highTimeframeAnalyses.crossState === "CrossDown" &&
    (price <= highTimeframeAnalyses.fastMa ||
      price <= highTimeframeAnalyses.slowMa)
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

  const candles = timeFrameRepo.candle;
  const lastCandles = takeLast(candles, 3, 0);

  const htBuySignal =
    ht.crossState === "CrossUp" && ht.trend === "StrongUptrend";
  const htSellSignal =
    ht.crossState === "CrossUp" && ht.trend === "StrongDowntrend";

  const ltBuySignal = lt.touchedMa && lt.crossState === "CrossUp";
  const ltSellSignal = lt.touchedMa && lt.crossState === "CrossDown";
  const hasOpenPosition = hasBuyPositions || hasSellPositions;

  if (htBuySignal && ltBuySignal && !hasOpenPosition) {
    console.log(`Buy signal on ${pair} at price: ${price}`);
    const lowPrices = lastCandles.map((c) => c.lowPrice);
    const stopLoss = Math.min(...lowPrices);
    const points = price - stopLoss;
    const takeProfit = price + points * 2;
    //await buyPosition(price, takeProfit, stopLoss);
    console.log("Buy", { price, takeProfit, stopLoss });
  }

  if (htSellSignal && ltSellSignal && !hasOpenPosition) {
    console.log(`Sell signal on ${pair} at price: ${price}`);
    const highPrices = lastCandles.map((c) => c.highPrice);
    const stopLoss = Math.max(...highPrices);
    const points = stopLoss - price;
    const takeProfit = price - points * 2;
    //await sellPosition(price, takeProfit, stopLoss);
    console.log("Sell", { price, takeProfit, stopLoss });
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
