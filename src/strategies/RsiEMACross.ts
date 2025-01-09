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
  const rsiValue = calcRsi(pairData.closePrices);
  const macdValue = calcMacd(pairData.closePrices);
  const crossUpValue = isEmaCrossUp(pairData.closePrices);
  const crossDownValue = isEmaCrossDown(pairData.closePrices);

  if (!rsiValue) return;
  if (!macdValue) return;

  const buySignal =
    rsiValue < 30 &&
    macdValue.histogram &&
    macdValue.histogram < 0; /*&& crossUpValue*/

  const sellSignal =
    rsiValue > 70 &&
    macdValue.histogram &&
    macdValue.histogram > 0; /*&& crossDownValue*/

  if (buySignal) {
    closePositions(price);
    buyPosition(price, 0.25);
  }

  if (sellSignal) {
    closePositions(price);
    sellPosition(price, 0.25);
  }
};

export default strategy;
