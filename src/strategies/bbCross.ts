import { OnStrategyType } from "../service/types";
import {
  calcbollingerbands,
  isEmaCrossUp,
  isEmaCrossDown,
  getTrend,
} from "../service/indicators";

const priceLevel = new Map<string, "overbought" | "oversold">();
const hasOrder = new Map<string, "buy" | "sell" | "none">();

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
  const period = 5;
  const stdDev = 2;

  let timeRepo = pairData.getTimeFrame(timeFrame);
  if (!timeRepo) return;

  let trend = getTrend(timeRepo?.closePrice);
  let bb = calcbollingerbands(timeRepo.closePrice, stdDev, period);

  if (!bb) return;

  const pairKey = pair + "." + timeFrame;

  // Check for crossing
  if (price > bb.upper) {
    priceLevel.set(pairKey, "overbought");
  } else if (price < bb.lower) {
    priceLevel.set(pairKey, "oversold");
  }

  const isOverbought = priceLevel.get(pairKey) === "overbought" || false;
  const isOversold = priceLevel.get(pairKey) === "oversold" || false;

  const hasBuyOrder = hasOrder.get(pair) === "buy" || false;
  const hasSellOrder = hasOrder.get(pair) === "sell" || false;

  const crossDown = isEmaCrossDown(timeRepo.closePrice);
  const crossUp = isEmaCrossUp(timeRepo.closePrice);

  const trendingDown = trend === "downtrend";
  const trendingUp = trend === "uptrend";

  if (!hasSellOrder && trendingDown && crossDown && isOverbought) {
    hasOrder.set(pair, "sell");
    closeBuyPosition(0);
    sellPosition(price, 0.1);
    priceLevel.delete(pairKey);
  }

  if (!hasBuyOrder && trendingUp && crossUp && isOversold) {
    hasOrder.set(pair, "buy");
    closeSellPostion(0);
    buyPosition(price, 0.1);
    priceLevel.delete(pairKey);
  }

  console.log({
    pairKey,
    timeFrame,
    date: new Date(),
    sellSignal: {
      hasSellOrder,
      trendingDown,
      crossDown,
      isOverbought,
    },
    buySignal: {
      hasBuyOrder,
      trendingUp,
      crossUp,
      isOversold,
    },
  });
};

export default strategy;
