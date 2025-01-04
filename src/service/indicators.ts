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

//Get last rsi value
export function calcRsi(closePrices: number[], period: number = 14): number {
  const values = rsi({ values: closePrices, period });
  const last = values[values.length - 1];
  return last;
}

//get last exponential moving average value
export function calcEma(closePrices: number[], period: number = 20): number {
  const values = ema({ values: closePrices, period });
  const last = values[values.length - 1];
  return last;
}

//get last simple moving average value
export function calcSma(closePrices: number[], period: number = 20): number {
  const values = sma({ values: closePrices, period });
  const last = values[values.length - 1];
  return last;
}

//Get last macd value
export function calcMacd(
  closePrices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDOutput {
  const values = macd({
    values: closePrices,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const last = values[values.length - 1];
  return last;
}

//Get last bollinger band value
export function calcbollingerbands(
  closePrices: number[],
  stdDev: number = 2,
  period: number = 26
): BollingerBandsOutput {
  const values = bollingerbands({ values: closePrices, period, stdDev });
  const last = values[values.length - 1];
  return last;
}

//Is two ema crossing up
export function isEmaCrossUp(
  closePrices: number[],
  fastEmaPeriod: number = 3,
  slowEmaPeriod: number = 4,
  limit: number = 4
): boolean {
  const fastEmaValues = ema({ values: closePrices, period: fastEmaPeriod });
  const slowEmaValues = ema({ values: closePrices, period: slowEmaPeriod });

  const fastLastElements = fastEmaValues.slice(
    Math.max(fastEmaValues.length - limit, 0)
  );
  const slowLastElements = slowEmaValues.slice(
    Math.max(slowEmaValues.length - limit, 0)
  );

  return (
    fastLastElements[0] > slowLastElements[0] &&
    fastLastElements[limit] < slowLastElements[limit]
  );
}

//Is two ema crossing down
export function isEmaCrossDown(
  closePrices: number[],
  fastEmaPeriod: number = 3,
  slowEmaPeriod: number = 4,
  limit: number = 4
): boolean {
  const fastEmaValues = ema({ values: closePrices, period: fastEmaPeriod });
  const slowEmaValues = ema({ values: closePrices, period: slowEmaPeriod });

  const fastLastElements = fastEmaValues.slice(
    Math.max(fastEmaValues.length - limit, 0)
  );
  const slowLastElements = slowEmaValues.slice(
    Math.max(slowEmaValues.length - limit, 0)
  );

  return (
    fastLastElements[0] < slowLastElements[0] &&
    fastLastElements[limit] > slowLastElements[limit]
  );
}

//Convert candles set to clsoing price array
export function getClosePrices(candles: CandleType[]): number[] {
  const canndlesArray = Array.from(candles.values());
  canndlesArray.sort((a, b) => a.key - b.key);
  const closePrices = canndlesArray.map((r) => r.closePrice);
  return closePrices;
}
