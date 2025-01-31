//trend-following with pullback strategy
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

const stopLossRatio: number = 2;
const takeProfitRatio: number = stopLossRatio * 1.5;

interface TimeFrameAnalysesType {
  highTrend: "Uptrend" | "Downtrend" | "Sideways" | undefined;
  highCrossState: "CrossUp" | "CrossDown" | undefined;
  highFastMa: number | undefined;
  highSlowMa: number | undefined;
  highSignal: "Buy" | "Sell" | undefined;
  lowCrossState: "CrossUp" | "CrossDown" | undefined;
  lowOverbought: boolean;
  lowOversold: boolean;
  lowSignal: "Buy" | "Sell" | undefined;
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
    highSignal: undefined,
    lowCrossState: undefined,
    lowOverbought: false,
    lowOversold: false,
    lowSignal: undefined,
  };

  //Find high timeframe trend direction using MA cross
  analyses.highCrossState =
    fastMa > slowMa ? "CrossUp" : slowMa > fastMa ? "CrossDown" : undefined;

  //Trend slope degree
  analyses.highTrend = getTrendDirection(slowMaArray);
  analyses.highFastMa = fastMa;
  analyses.highSlowMa = slowMa;

  //High timeframe signal
  if (analyses.highCrossState === "CrossUp" && analyses.highTrend === "Uptrend")
    analyses.highSignal = "Buy";
  else if (
    analyses.highCrossState === "CrossDown" &&
    analyses.highTrend === "Downtrend"
  )
    analyses.highSignal = "Sell";
  else analyses.highSignal = undefined;

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
    analyses.highTrend === "Uptrend" &&
    analyses.highCrossState === "CrossUp" &&
    (price <= analyses.highFastMa || price <= analyses.highSlowMa)
  ) {
    analyses.lowOversold = true;
    analyses.lowOverbought = false;
  }

  if (
    analyses.highTrend === "Downtrend" &&
    analyses.highCrossState === "CrossDown" &&
    (price >= analyses.highFastMa || price >= analyses.highSlowMa)
  ) {
    analyses.lowOverbought = true;
    analyses.lowOversold = false;
  }

  //Low timeframe signals
  if (analyses.lowOversold && analyses.lowCrossState === "CrossUp")
    analyses.lowSignal = "Buy";
  else if (analyses.lowOverbought && analyses.lowCrossState === "CrossDown")
    analyses.lowSignal = "Sell";
  else analyses.lowSignal = undefined;

  pairAnalyses.set(pair, analyses);

  //console.log(pair, analyses);
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

  if (
    analyses.highSignal === "Buy" &&
    analyses.lowSignal === "Buy" &&
    !hasBuyPositions &&
    !isBuyTriggered(pair)
  ) {
    //Buy signal
    setBuyTriggered(pair);
    console.log(`Buy signal on ${pair} at price: ${price}`);

    const takeProfit = price + atr * takeProfitRatio;
    await buyPosition(price, takeProfit, 0);
  }

  if (
    analyses.highSignal === "Sell" &&
    analyses.lowSignal === "Sell" &&
    !hasSellPositions &&
    !isSellTriggered(pair)
  ) {
    //Sell signal
    setSellTriggered(pair);
    console.log(`Sell signal on ${pair} at price: ${price}`);

    const takeProfit = price - atr * takeProfitRatio;
    await sellPosition(price, takeProfit, 0);
  }
};

const closeReversingTrades = async (
  pair: string,
  analyses: TimeFrameAnalysesType,
  hasBuyPositions: boolean,
  hasSellPositions: boolean,
  closeBuyPosition: (price: number) => Promise<void>,
  closeSellPosition: (price: number) => Promise<void>
) => {
  if (
    analyses.highSignal === "Sell" &&
    analyses.lowSignal === "Sell" &&
    hasBuyPositions
  ) {
    console.log(`${pair}: High trend revered. Closing buy orders`);
    await closeBuyPosition(0);
    clearBuyTrigger(pair);
  }

  if (
    analyses.highSignal === "Buy" &&
    analyses.lowSignal === "Buy" &&
    hasSellPositions
  ) {
    console.log(`${pair}:  High trend revered. Closing sell orders`);
    await closeSellPosition(0);
    clearSellTrigger(pair);
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

  const highTimeframe = "240"; //4 hour
  const lowTimeframe = "5"; //5 Minutes

  const isSmallTimeframe = timeFrame === lowTimeframe;
  const isLargeTimeframe = timeFrame === highTimeframe;

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
    calcLowTimeFrameAnalyses(price, pair, prices, pairData, lowTimeframe);
  }

  //Check for trade signals
  if (isSmallTimeframe && !isPairUnderProcessing(pair)) {
    const analyses = pairAnalyses.get(pair);
    if (analyses) {
      setPairUnderProcessing(pair);
      closeReversingTrades(
        pair,
        analyses,
        hasBuyPositions,
        hasSellPositions,
        closeBuyPosition,
        closeSellPostion
      );
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
