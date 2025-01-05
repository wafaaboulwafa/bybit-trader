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

  if (buySignal) {
    closePositions();
    buyPosition(1);
  }

  if (sellSignal) {
    closePositions();
    sellPosition(1);
  }
};

export default strategy;
