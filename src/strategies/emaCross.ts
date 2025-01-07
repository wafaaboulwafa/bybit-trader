import { OnUpdateType } from "../service/types";
import {
  calcRsi,
  calcEma,
  calcSma,
  calcMacd,
  calcbollingerbands,
  isEmaCrossUp,
  isEmaCrossDown,
} from "../service/indicators";

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
  const crossUpValue = isEmaCrossUp(closePrices);
  const crossDownValue = isEmaCrossDown(closePrices);

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
