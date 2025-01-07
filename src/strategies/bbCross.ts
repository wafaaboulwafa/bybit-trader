import { OnUpdateType } from "../service/types";
import {
  calcRsi,
  calcEma,
  calcSma,
  calcMacd,
  calcbollingerbands,
  isEmaCrossUp,
  isEmaCrossDown,
  getTrend,
} from "../service/indicators";
import { bollingerbands } from "technicalindicators";

const lastSignal = new Map<string, "overbought" | "oversold">();

const strategy: OnUpdateType = (
  pair,
  timeFrame,
  candles,
  closePrices,
  price,
  candle,
  buyPosition,
  sellPosition,
  closePositions
) => {
  const period = 5;
  const stdDev = 2;

  let trend = getTrend(closePrices);
  let bb = calcbollingerbands(closePrices, stdDev, period);

  if (!bb) return;

  // Check for crossing
  if (price > bb.upper) {
    lastSignal.set(pair + "." + timeFrame, "overbought");
  } else if (price < bb.lower) {
    lastSignal.set(pair + "." + timeFrame, "oversold");
  }

  const signal = lastSignal.get(pair + "." + timeFrame);
  const buySignal =
    signal === "overbought" &&
    isEmaCrossDown(closePrices) &&
    trend === "downtrend";
  ////

  const sellSignal =
    signal === "oversold" && isEmaCrossUp(closePrices) && trend === "uptrend";

  if (buySignal) buyPosition(bb.lower, 0.5);
  if (sellSignal) closePositions(bb.upper);

  if (buySignal || sellSignal) lastSignal.delete(pair + "." + timeFrame);
};

export default strategy;
