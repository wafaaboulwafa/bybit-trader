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
  const rsiValue = calcRsi(closePrices);
  const macdValue = calcMacd(closePrices);
  const crossUpValue = isEmaCrossUp(closePrices);
  const crossDownValue = isEmaCrossDown(closePrices);

  const buySignal =
    rsiValue < 30 && macdValue?.MACD && macdValue.MACD > 0 && crossUpValue;
  const sellSignal =
    rsiValue > 70 && macdValue?.MACD && macdValue.MACD < 0 && crossDownValue;

  if (buySignal) {
    closePositions();
    buyPosition(0.25);
  }

  if (sellSignal) {
    closePositions();
    sellPosition(0.25);
  }
};

export default strategy;
