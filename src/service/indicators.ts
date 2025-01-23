import { MACDOutput } from "technicalindicators/declarations/moving_averages/MACD";
import { BollingerBandsOutput } from "technicalindicators/declarations/volatility/BollingerBands";
import {
  rsi,
  macd,
  sma,
  ema,
  bollingerbands,
  crossUp,
  crossDown,
  CandleData,
} from "technicalindicators";
import { CandleType } from "./types";

export function getLastValue(values: number[]): number | undefined {
  return (values.length > 0 && values[values.length - 1]) || undefined;
}

//Get last rsi value
export function calcRsi(
  closePrices: number[],
  period: number = 14
): number | undefined {
  const values = rsi({ values: closePrices, period });
  return getLastValue(values);
}

//get last exponential moving average value
export function calcEma(
  closePrices: number[],
  period: number = 20
): number | undefined {
  const values = ema({ values: closePrices, period });
  return getLastValue(values);
}

//get last simple moving average value
export function calcSma(
  closePrices: number[],
  period: number = 20
): number | undefined {
  const values = sma({ values: closePrices, period });
  return getLastValue(values);
}

//Get last macd value
export function calcMacd(
  closePrices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDOutput | undefined {
  const values = macd({
    values: closePrices,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const result = (values.length > 0 && values[values.length - 1]) || undefined;
  return result;
}

//Get last bollinger band value
export function calcbollingerbands(
  closePrices: number[],
  stdDev: number = 2,
  period: number = 26
): BollingerBandsOutput | undefined {
  const values = bollingerbands({ values: closePrices, period, stdDev });
  const result = (values.length > 0 && values[values.length - 1]) || undefined;
  return result;
}

//Is two ema crossing up
export function isEmaCrossUp(
  closePrices: number[],
  fastEmaPeriod: number = 3,
  slowEmaPeriod: number = 5,
  limit: number = 5
): boolean | undefined {
  const fastEmaValues = ema({ values: closePrices, period: fastEmaPeriod });
  const slowEmaValues = ema({ values: closePrices, period: slowEmaPeriod });

  if (fastEmaValues.length < limit || slowEmaValues.length < limit)
    return undefined;

  const fastEmaOld = fastEmaValues[fastEmaValues.length - limit];
  const fastEmaNew = fastEmaValues[fastEmaValues.length - 1];

  const slowEmaOld = slowEmaValues[slowEmaValues.length - limit];
  const slowEmaNew = slowEmaValues[slowEmaValues.length - 1];

  const result = fastEmaNew > slowEmaNew && fastEmaOld < slowEmaOld;
  return result;
}

//Is two ema crossing down
export function isEmaCrossDown(
  closePrices: number[],
  fastEmaPeriod: number = 3,
  slowEmaPeriod: number = 5,
  limit: number = 5
): boolean | undefined {
  const fastEmaValues = ema({ values: closePrices, period: fastEmaPeriod });
  const slowEmaValues = ema({ values: closePrices, period: slowEmaPeriod });

  if (fastEmaValues.length < limit || slowEmaValues.length < limit)
    return undefined;

  const fastEmaOld = fastEmaValues[fastEmaValues.length - limit];
  const fastEmaNew = fastEmaValues[fastEmaValues.length - 1];

  const slowEmaOld = slowEmaValues[slowEmaValues.length - limit];
  const slowEmaNew = slowEmaValues[slowEmaValues.length - 1];

  const result = fastEmaNew < slowEmaNew && fastEmaOld > slowEmaOld;
  return result;
}

export function getTrend(
  closePrices: number[],
  period: number = 5,
  stdDev: number = 2
): "uptrend" | "downtrend" | "sideways" | undefined {
  const bbResult = bollingerbands({ values: closePrices, stdDev, period });

  if (bbResult.length < 2) {
    return undefined;
  }

  let trend: "uptrend" | "downtrend" | "sideways" | undefined = undefined;
  const middleBands = bbResult.map((b) => b.middle);

  const recentSlope =
    middleBands[middleBands.length - 1] - middleBands[middleBands.length - 2];

  if (recentSlope > 0) {
    trend = "uptrend";
  } else if (recentSlope < 0) {
    trend = "downtrend";
  } else {
    trend = "sideways";
  }

  return trend;
}

type ZigZagPoint = {
  value: number;
  type: "High" | "Low";
  index: number;
};

export function calculateZigZag(
  candles: CandleType[],
  depth: number = 2,
  deviation: number = 5
): ZigZagPoint[] {
  const zigzagPoints: ZigZagPoint[] = [];
  let trend = 0; // 1: uptrend, -1: downtrend, 0: no trend
  let lastHigh = candles[0].highPrice;
  let lastLow = candles[0].lowPrice;
  let lastPeakIndex = 0;

  for (let i = candles.length - 2; i >= 0; i++) {
    const high = candles[i].highPrice;
    const low = candles[i].lowPrice;

    if (trend === 0) {
      if (high > lastHigh) {
        trend = 1;
        lastPeakIndex = i;
        zigzagPoints.push({ index: i, value: high, type: "High" });
      } else if (low < lastLow) {
        trend = -1;
        lastPeakIndex = i;
        zigzagPoints.push({ index: i, value: low, type: "Low" });
      }
    } else if (trend === 1) {
      if (high > lastHigh) {
        lastHigh = high;
        lastPeakIndex = i;
        zigzagPoints[zigzagPoints.length - 1] = {
          index: i,
          value: high,
          type: "High",
        };
      } else if (lastHigh - low >= (deviation / 100) * lastHigh) {
        trend = -1;
        lastLow = low;
        zigzagPoints.push({ index: i, value: low, type: "Low" });
        lastPeakIndex = i;
      }
    } else if (trend === -1) {
      if (low < lastLow) {
        lastLow = low;
        lastPeakIndex = i;
        zigzagPoints[zigzagPoints.length - 1] = {
          index: i,
          value: low,
          type: "Low",
        };
      } else if (high - lastLow >= (deviation / 100) * lastLow) {
        trend = 1;
        lastHigh = high;
        zigzagPoints.push({ index: i, value: high, type: "High" });
        lastPeakIndex = i;
      }
    }

    if (i - lastPeakIndex >= depth) {
      trend = 0;
    }
  }

  return zigzagPoints;
}
