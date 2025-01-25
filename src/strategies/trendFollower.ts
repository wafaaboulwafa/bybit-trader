import { OnStrategyType } from "../service/types";
import {
  calcEma,
  getLastValue,
  getTrendDirection,
} from "../service/indicators";
import { takeFirst, takeLast } from "../service/misc";
import PairRepo from "../repository/pairRepo";
import { sma } from "technicalindicators";

interface TimeFrameAnalysesType {
  highTrend:
    | "Uptrend"
    | "Downtrend"
    | "Sideways"
    | "StrongUptrend"
    | "StrongDowntrend"
    | undefined;
  highCrossState: "CrossUp" | "CrossDown" | undefined;
  highFastMa: number | undefined;
  highSlowMa: number | undefined;
  lowCrossState: "CrossUp" | "CrossDown" | undefined;
  lowOverbough: boolean;
  lowOversold: boolean;
}

const pairAnalyses = new Map<string, TimeFrameAnalysesType>();

const calcHighTimeFrameAnalyses = (pair: string, prices: number[]) => {
  const fastMaArray = sma({ values: prices, period: 15 });
  const slowMaArray = sma({ values: prices, period: 20 });

  const fastMa = getLastValue(fastMaArray);
  const slowMa = getLastValue(slowMaArray);

  if (!fastMa || !slowMa) return;

  const analyses: TimeFrameAnalysesType = pairAnalyses.get(pair) || {
    highTrend: undefined,
    highCrossState: undefined,
    highFastMa: undefined,
    highSlowMa: undefined,
    lowCrossState: undefined,
    lowOverbough: false,
    lowOversold: false,
  };

  //Find high timeframe trend direction using MA cross
  analyses.highCrossState =
    fastMa > slowMa ? "CrossUp" : slowMa > fastMa ? "CrossDown" : undefined;

  //Trend slope degree
  analyses.highTrend = getTrendDirection(slowMaArray);
  analyses.highFastMa = fastMa;
  analyses.highSlowMa = slowMa;

  pairAnalyses.set(pair, analyses);
};

const calcLowTimeFrameAnalyses = (
  price: number,
  pair: string,
  prices: number[]
) => {
  const analyses = pairAnalyses.get(pair);

  //Wait fir high timeframe analyses
  if (
    analyses === undefined ||
    analyses.highTrend === undefined ||
    analyses.highFastMa === undefined ||
    analyses.highSlowMa === undefined
  )
    return;

  const fastEma = calcEma(prices, 1);
  const slowEma = calcEma(prices, 2);

  if (!fastEma || !slowEma) return;

  //Find low timeframe MA cross
  if (fastEma > slowEma) analyses.lowCrossState = "CrossUp";
  if (fastEma < slowEma) analyses.lowCrossState = "CrossDown";

  //Find price cross for MA to define overbought and oversold levels
  if (
    (analyses.highTrend === "StrongUptrend" ||
      analyses.highTrend === "Uptrend") &&
    analyses.highCrossState === "CrossUp" &&
    (price <= analyses.highFastMa || price <= analyses.highSlowMa)
  ) {
    analyses.lowOversold = true;
    analyses.lowOverbough = false;
  }

  if (
    (analyses.highTrend === "StrongDowntrend" ||
      analyses.highTrend === "Downtrend") &&
    analyses.highCrossState === "CrossDown" &&
    (price >= analyses.highFastMa || price >= analyses.highSlowMa)
  ) {
    analyses.lowOverbough = true;
    analyses.lowOversold = false;
  }

  pairAnalyses.set(pair, analyses);
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

  const analyses = pairAnalyses.get(pair);

  if (!analyses || price === 0) return;

  //console.log("Pair: " + pair, analyses);

  const recentCandles = takeFirst(timeFrameRepo.candle, 3, 0);

  //High timeframe signals
  const htBuySignal =
    analyses.highCrossState === "CrossUp" &&
    (analyses.highTrend === "StrongUptrend" ||
      analyses.highTrend === "Uptrend");
  const htSellSignal =
    analyses.highCrossState === "CrossDown" &&
    (analyses.highTrend === "StrongDowntrend" ||
      analyses.highTrend === "Downtrend");

  //Low timeframe signals
  const ltBuySignal =
    analyses.lowOversold && analyses.lowCrossState === "CrossUp";
  const ltSellSignal =
    analyses.lowOverbough && analyses.lowCrossState === "CrossDown";

  //Any previous open positions
  const hasOpenPosition = hasBuyPositions || hasSellPositions;

  if (htBuySignal && ltBuySignal && !hasOpenPosition) {
    //Buy signal
    console.log(`Buy signal on ${pair} at price: ${price}`);
    const lowPrices = recentCandles.map((c) => c.lowPrice);
    const stopLoss = Math.min(...lowPrices);
    const points = price - stopLoss;
    const takeProfit = price + points * 2;
    await buyPosition(price, takeProfit, stopLoss);
    //console.log("Buy", { price, takeProfit, stopLoss });
  }

  if (htSellSignal && ltSellSignal && !hasOpenPosition) {
    //Sell signal
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
    //High timeframe analysis
    calcHighTimeFrameAnalyses(pair, prices);
  } else if (isSmallTimeframe) {
    //Low timeframe analysis
    calcLowTimeFrameAnalyses(price, pair, prices);
    //Check for trade signals
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
