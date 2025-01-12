import { OnStrategyType } from "../service/types";
import { calcRsi } from "../service/indicators";
import { bollingerbands } from "technicalindicators";
import { BollingerBandsOutput } from "technicalindicators/declarations/volatility/BollingerBands";

const getTrendDirection = (
  bb: BollingerBandsOutput[]
): "uptrend" | "downtrend" | "sideways" => {
  const middleBands = bb.map((b) => b.middle);

  const recentSlope =
    middleBands[middleBands.length - 1] - middleBands[middleBands.length - 2];

  if (recentSlope > 0) return "uptrend";
  else if (recentSlope < 0) return "downtrend";
  else return "sideways";
};

const bbCross = new Map<string, "upper" | "lower">();
const rsiCross = new Map<string, "overbought" | "oversold">();
const lastOrderSignal = new Map<string, "buy" | "sell">();

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
  const timeFrameRepo = pairData.getTimeFrame(timeFrame);
  if (!timeFrameRepo) return;

  const prices = timeFrameRepo?.closePrice || [];
  if (prices.length < 100) return;

  const bbArray = bollingerbands({
    values: prices,
    stdDev: 2,
    period: 100,
  });

  const lastRsi = calcRsi(prices, 14);
  const fastEma = calcRsi(prices, 1);
  const slowEma = calcRsi(prices, 2);
  const bb = bbArray[bbArray.length - 1];
  const trend = getTrendDirection(bbArray);

  if (!lastRsi || !fastEma || !slowEma) return;

  const pairkey = pair + "." + timeFrame;

  console.log(
    `Trend: ${trend}, RSI: ${lastRsi}, Fast EMA: ${fastEma.toFixed(
      6
    )}, Slow EMA: ${slowEma.toFixed(6)}, Upper: ${bb.upper.toFixed(
      6
    )}, Middle: ${bb.middle.toFixed(6)}, Lower: ${bb.lower.toFixed(6)}`
  );

  //Close buy orders
  if (price > bb.upper) {
    closeBuyPosition(0);
    bbCross.set(pairkey, "upper");
  }

  //Close buy orders
  if (price < bb.lower) {
    closeSellPostion(0);
    bbCross.set(pairkey, "lower");
  }

  if (lastRsi < 35) {
    rsiCross.set(pairkey, "oversold");
  }

  if (lastRsi > 65) {
    rsiCross.set(pairkey, "oversold");
  }

  const isTrendUp = trend === "uptrend";
  const isTrendDown = trend === "downtrend";

  const isCrossUp = fastEma > slowEma;
  const isCrosDown = fastEma < slowEma;

  const isOversold = rsiCross.get(pairkey) === "oversold" || false;
  const isOverbought = rsiCross.get(pairkey) === "overbought" || false;

  const hasBuyOrder = lastOrderSignal.get(pair) === "buy" || false;
  const hasSellOrder = lastOrderSignal.get(pair) === "sell" || false;

  if (isTrendUp && isOversold && isCrossUp && !hasBuyOrder) {
    console.log(`BUY signal at price: ${price.toFixed(6)}`);
    //Buy signal
    buyPosition(price, 0.1);
    lastOrderSignal.set(pair, "buy");
    bbCross.delete(pairkey);
    rsiCross.delete(pairkey);
  }

  if (isTrendDown && isOverbought && isCrosDown && !hasSellOrder) {
    console.log(`SELL signal at price: ${price.toFixed(6)}`);
    //Sell signal
    buyPosition(price, 0.1);
    lastOrderSignal.set(pair, "sell");
    bbCross.delete(pairkey);
    rsiCross.delete(pairkey);
  }
};

export default strategy;
