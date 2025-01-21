import { OnStrategyType } from "../service/types";
import { calcEma, calcRsi } from "../service/indicators";
import { takeLast } from "../service/misc";
import { SMA } from "technicalindicators";

function analyzeTrendBySlope(
  prices: number[]
): "Uptrend" | "Downtrend" | "Sideways" | "StrongUptrend" | "StrongDowntrend" {
  const mediumThreshold = 0.01;
  const strongThreshold = 0.05;

  if (!Array.isArray(prices) || prices.length < 2) {
    throw new Error("Input must be an array with at least two prices.");
  }

  // Calculate the slope using least squares regression
  const n = prices.length;
  const x = Array.from({ length: n }, (_, i) => i + 1); // x values: [1, 2, 3, ..., n]
  const sumX = x.reduce((sum, xi) => sum + xi, 0);
  const sumY = prices.reduce((sum, yi) => sum + yi, 0);
  const sumXY = prices.reduce((sum, yi, i) => sum + yi * x[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  // Calculate the slope (m)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // Determine trend based on slope and thresholds
  if (slope > strongThreshold) {
    return "StrongUptrend";
  } else if (slope > mediumThreshold) {
    return "StrongUptrend";
  } else if (slope < -strongThreshold) {
    return "StrongDowntrend";
  } else if (slope < -mediumThreshold) {
    return "Downtrend";
  } else {
    return "Sideways";
  }
}

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
  /*Requrements:
    has open postions?
    SL and TP    
  */
  const isSmallTimeframe = timeFrame === "15";
  const isLargeTimeframe = timeFrame === "240"; //4 hour

  if (!isSmallTimeframe && !isLargeTimeframe) return;

  const timeFrameRepo = pairData.getTimeFrame(timeFrame);
  if (!timeFrameRepo) return;

  const prices = timeFrameRepo?.ohlc4 || [];
  if (prices.length < 100) return;

  if (isLargeTimeframe) {
    /*Find:
    MA cross
    trend direction
    trend strength
    high or low areas 
    */
    const fastMa = SMA.calculate({ period: 15, values: prices });
    const slowMa = SMA.calculate({ period: 20, values: prices });

    const trend = analyzeTrendBySlope(prices);
  } else if (isSmallTimeframe) {
    /*Find:
    Trade ratio 1 : 2
    Entry on touch of MA 20
    Top loss on last ziazag high
    TP based on ratio between last high and entry when EA cross
    Only take trade if no trades are open
    */
  }
};

export default strategy;
