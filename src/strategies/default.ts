import { OnStrategyType } from "../service/types";

const strategy: OnStrategyType = (
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
  console.log(`Pair: ${pair},Timeframe: ${timeFrame}, Price: ${price}`);
};

export default strategy;
