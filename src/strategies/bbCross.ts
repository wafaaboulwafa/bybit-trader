import { OnStrategyType } from "../service/types";
import { calcEma, calcRsi } from "../service/indicators";
import { bollingerbands } from "technicalindicators";
import { BollingerBandsOutput } from "technicalindicators/declarations/volatility/BollingerBands";
import { takeLast } from "../service/misc";

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

  const originalPrices = timeFrameRepo?.ohlc4 || [];

  const prices = takeLast(originalPrices, 200, 0);

  if (prices.length < 100) return;

  const bbArray = bollingerbands({
    values: prices,
    stdDev: 2,
    period: 100,
  });

  const lastRsi = calcRsi(prices, 14);
  const fastEma = calcEma(prices, 1);
  const slowEma = calcEma(prices, 2);
  const bb = bbArray[bbArray.length - 1];
  const trend = getTrendDirection(bbArray);

  if (!lastRsi || !fastEma || !slowEma) return;

  const pairkey = pair + "." + timeFrame;
  /*
  console.log(
    `Price: ${price}, Trend: ${trend}, RSI: ${lastRsi}, Fast EMA: ${fastEma.toFixed(
      6
    )}, Slow EMA: ${slowEma.toFixed(6)}, Upper: ${bb.upper.toFixed(
      6
    )}, Middle: ${bb.middle.toFixed(6)}, Lower: ${bb.lower.toFixed(
      6
    )}, bbCross: ${bbCross.get(pairkey) || "none"}, rsiCross: ${
      rsiCross.get(pairkey) || "none"
    }, lastOrderSignal: ${lastOrderSignal.get(pair) || "none"}`
  );
  */
  const hasBuyOrder = lastOrderSignal.get(pair) === "buy" || false;
  const hasSellOrder = lastOrderSignal.get(pair) === "sell" || false;

  //Close buy orders
  if (price > bb.upper && hasBuyOrder) {
    console.log(`Close all BUY orders at price: ${price.toFixed(6)}`);
    closeBuyPosition(0);
    lastOrderSignal.delete(pair);
    bbCross.set(pairkey, "upper");
  }

  //Close sell orders
  if (price < bb.lower && hasSellOrder) {
    console.log(`Close all SELL orders at price: ${price.toFixed(6)}`);
    closeSellPostion(0);
    lastOrderSignal.delete(pair);
    bbCross.set(pairkey, "lower");
  }

  if (lastRsi < 35) {
    rsiCross.set(pairkey, "oversold");
  }

  if (lastRsi > 65) {
    rsiCross.set(pairkey, "overbought");
  }

  const isTrendUp = trend === "uptrend";
  const isTrendDown = trend === "downtrend";

  const isCrossUp = fastEma > slowEma;
  const isCrosDown = fastEma < slowEma;

  const isOversold =
    (price < bb.middle && rsiCross.get(pairkey) === "oversold") || false;
  const isOverbought =
    (price > bb.middle && rsiCross.get(pairkey) === "overbought") || false;

  if (isTrendUp && isOversold && isCrossUp && !hasBuyOrder) {
    //Buy signal
    console.log(`BUY signal at price: ${price.toFixed(6)}`);
    closeSellPostion(0);
    buyPosition(price);
    lastOrderSignal.set(pair, "buy");
    bbCross.delete(pairkey);
    rsiCross.delete(pairkey);
  }

  if (isTrendDown && isOverbought && isCrosDown && !hasSellOrder) {
    //Sell signal
    console.log(`SELL signal at price: ${price.toFixed(6)}`);
    closeBuyPosition(0);
    sellPosition(price);
    lastOrderSignal.set(pair, "sell");
    bbCross.delete(pairkey);
    rsiCross.delete(pairkey);
  }
};

export default strategy;
