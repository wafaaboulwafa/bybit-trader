import { OnStrategyType } from "../service/types";
import {
  calcRsi,
  calcEma,
  calcSma,
  calcMacd,
  calcbollingerbands,
  isEmaCrossUp,
  isEmaCrossDown,
} from "../service/indicators";

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
  const crossUpValue = isEmaCrossUp(pairData.closePrices);
  const crossDownValue = isEmaCrossDown(pairData.closePrices);

  if (crossUpValue === undefined || crossDownValue === undefined) return;

  const buySignal = crossUpValue;
  const sellSignal = crossDownValue;
  const emaPrice = calcEma(closePrices, 5);

  if (buySignal && emaPrice) {
    buyPosition(emaPrice, 0.5);
  }

  if (sellSignal && emaPrice) {
    closePositions(emaPrice);
  }
};

export default strategy;
