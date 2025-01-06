import { MACDOutput } from "technicalindicators/declarations/moving_averages/MACD";
import { BollingerBandsOutput } from "technicalindicators/declarations/volatility/BollingerBands";
import { CandleType } from "./types";
import {
  rsi,
  macd,
  sma,
  ema,
  bollingerbands,
  crossUp,
  crossDown,
} from "technicalindicators";

function getLastValue(values: number[]): number | undefined {
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

//Convert candles set to clsoing price array
export function getClosePrices(candles: Map<number, CandleType>): number[] {
  const canndlesArray = Array.from(candles.values());
  canndlesArray.sort((a, b) => a.key - b.key);
  const closePrices = canndlesArray.map((r) => r.closePrice);
  return closePrices;
}
