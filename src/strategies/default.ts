import { OnStrategyType } from "../service/types";

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
  console.log(`Pair: ${pair},Timeframe: ${timeFrame}, Price: ${price}`);
};

export default strategy;
