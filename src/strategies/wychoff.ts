import { CandleType, OnStrategyType } from "../service/types";
import { SMA, RSI } from "technicalindicators";
//import { notifyChart } from "../service/telgramClient";

type AnalysesType =
  | "NoSignal"
  | "Mark-up"
  | "Mark-down"
  | "Hold-Long"
  | "Hold-Short"
  | "Accumulation"
  | "Distribution"
  | "Consolidation";

type SignalType = "Buy" | "Sell" | "None";

type AnalysesWithSignalType = {
  analyses: AnalysesType;
  signal: SignalType;
};

type TrendlineType = "Uptrend" | "Downtrend" | "Sideways";

const lastSignal = new Map<string, SignalType>();
const rsiPeriod = 14; // RSI period
const lastAnalyses = new Map<string, AnalysesType>();

// Identify Support and Resistance Levels
function identifyLevels(data: CandleType[]) {
  const highs = data.map((d) => d.highPrice);
  const lows = data.map((d) => d.lowPrice);

  const recentHighs = highs.slice(-10);
  const recentLows = lows.slice(-10);

  return {
    resistance: Math.max(...recentHighs),
    support: Math.min(...recentLows),
  };
}

// Detect Trendlines (Approximation using slope)
function detectTrendlines(data: CandleType[]): TrendlineType {
  const closes = data.map((d) => d.closePrice);
  const recent = closes.slice(-10);
  const slopes = recent.map((price, i, arr) =>
    i > 0 ? price - arr[i - 1] : 0
  );

  const avgSlope = slopes.reduce((a, b) => a + b, 0) / slopes.length;

  if (avgSlope > 0) return "Uptrend";
  if (avgSlope < 0) return "Downtrend";
  return "Sideways";
}

// Analyze Data with RSI Confirmation
function analyzeData(data: CandleType[]): AnalysesWithSignalType {
  const closes = data.map((d) => d.closePrice);
  const sma20 = SMA.calculate({ period: 20, values: closes });
  const sma50 = SMA.calculate({ period: 50, values: closes });
  const rsi = RSI.calculate({ period: rsiPeriod, values: closes });

  const lastPrice = closes[closes.length - 1];
  const lastSma20 = sma20[sma20.length - 1];
  const lastSma50 = sma50[sma50.length - 1];
  const lastRsi = rsi[rsi.length - 1];
  const { support, resistance } = identifyLevels(data);
  const trendline = detectTrendlines(data);

  let result: AnalysesWithSignalType = {
    analyses: "NoSignal",
    signal: "None",
  };

  // Wyckoff Signal Logic with RSI Confirmation
  if (lastPrice > resistance && lastSma20 > lastSma50 && lastRsi < 70) {
    //Bullish Breakout - Mark-up Phase (Buy Signal)
    result.analyses = "Mark-up";
    result.signal = "Buy";
  } else if (lastPrice < support && lastSma20 < lastSma50 && lastRsi > 30) {
    //Bearish Breakdown - Mark-down Phase (Sell Signal)
    result.analyses = "Mark-down";
    result.signal = "Sell";
  } else if (trendline === "Uptrend" && lastRsi < 70) {
    //Uptrend Continues (Hold Long)
    result.analyses = "Hold-Long";
  } else if (trendline === "Downtrend" && lastRsi > 30) {
    //Downtrend Continues (Hold Short)
    result.analyses = "Hold-Short";
  } else if (lastPrice < resistance && lastPrice > support) {
    // Accumulation or Distribution Phase
    if (lastPrice < (support + resistance) / 2 && lastRsi < 50) {
      //Accumulation Phase Detected (Potential Buy Setup)
      result.analyses = "Accumulation";
      if (lastSma20 > lastSma50) {
        result.signal = "Buy";
      }
    } else if (lastPrice > (support + resistance) / 2 && lastRsi > 50) {
      //Distribution Phase Detected (Potential Sell Setup)
      result.analyses = "Distribution";
      if (lastSma20 < lastSma50) {
        result.signal = "Sell";
      }
    } else {
      //Consolidation Detected (Unclear Phase)
      result.analyses = "Consolidation";
    }
  } else {
    //No Clear Signal (Wait)
  }

  return result;
}

const strategy: OnStrategyType = (
  pair,
  timeFrame,
  price,
  candle,
  buyPosition,
  sellPosition,
  closeBuyPosition,
  closeSellPostion,
  pairData
) => {
  //"1h", "4h", "1d" : Timeframes to analyze
  const analyses = new Map<string, AnalysesWithSignalType>();
  for (const timeframe of pairData.timeFrames) {
    const timeFrameRepo = pairData.getTimeFrame(timeframe);
    const data = timeFrameRepo?.candle;
    if (!data) continue;

    const newAnalyses = analyzeData(data);
    const prevAnalyses = lastAnalyses.get(pair + "." + timeFrame);

    if (prevAnalyses != newAnalyses.analyses) {
      lastAnalyses.set(pair + "." + timeFrame, newAnalyses.analyses);
      /*
      notifyChart(
        "Wychoff stage change\r\nPair: ${pair}\r\nTimeFrame: ${timeFrame}",
        pair,
        data
      );*/
    }

    if (timeFrameRepo?.candle.length > rsiPeriod) {
      analyses.set(timeFrame, newAnalyses);
    }
  }

  const isBuy = Array.from(analyses.values())
    .map((r) => r.signal)
    .reduce(
      (prev, current) => (prev === "Buy" && current === "Buy" ? "Buy" : "None"),
      "Buy"
    );

  const isSell = Array.from(analyses.values())
    .map((r) => r.signal)
    .reduce(
      (prev, current) =>
        prev === "Sell" && current === "Sell" ? "Sell" : "None",
      "Sell"
    );

  const signal: SignalType = isBuy ? "Buy" : isSell ? "Sell" : "None";

  const lastSignalValue = lastSignal.get(pair) || "None";
  const buySignal = signal !== lastSignalValue && signal === "Buy";
  const sellSignal =
    signal !== lastSignalValue && signal === "Sell"; /*&& crossDownValue*/

  if (buySignal) {
    closeSellPostion(0);
    buyPosition(price, 0.1);
  }

  if (sellSignal) {
    closeBuyPosition(price);
    sellPosition(price, 0.1);
  }

  lastSignal.set(pair, signal);
};

export default strategy;
