import { OnStrategyType } from "../service/types";
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
import { notifyChart } from "../service/telgramClient";

const lastSignal = new Map<string, "overbought" | "oversold">();

const strategy: OnStrategyType = (
  pair,
  timeFrame,
  price,
  candle,
  buyPosition,
  sellPosition,
  closePositions,
  pairData
) => {
  const period = 5;
  const stdDev = 2;

  let timeRepo = pairData.getTimeFrame(timeFrame);
  if (!timeRepo) return;

  let trend = getTrend(timeRepo?.closePrice);
  let bb = calcbollingerbands(timeRepo.closePrice, stdDev, period);

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
    isEmaCrossDown(timeRepo.closePrice) &&
    trend === "downtrend";
  ////

  const sellSignal =
    signal === "oversold" &&
    isEmaCrossUp(timeRepo.closePrice) &&
    trend === "uptrend";

  if (buySignal) {
    buyPosition(bb.lower, 0.5);
    notifyChart("bbCross buy signal", pair, timeRepo.candle);
  }
  if (sellSignal) {
    closePositions(bb.upper);
    notifyChart("bbCross sell signal", pair, timeRepo.candle);
  }

  if (buySignal || sellSignal) lastSignal.delete(pair + "." + timeFrame);
};

export default strategy;
