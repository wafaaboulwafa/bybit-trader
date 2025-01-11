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
  closeBuyPosition,
  closeSellPostion,
  pairData
) => {
  let timeRepo = pairData.getTimeFrame(timeFrame);
  if (!timeRepo) return;

  const rsiValue = calcRsi(timeRepo.closePrice);
  const macdValue = calcMacd(timeRepo.closePrice);
  const crossUpValue = isEmaCrossUp(timeRepo.closePrice);
  const crossDownValue = isEmaCrossDown(timeRepo.closePrice);

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
    closeSellPostion(0);
    buyPosition(price, 0.1);
  }

  if (sellSignal) {
    closeBuyPosition(price);
    sellPosition(price, 0.1);
  }
};

export default strategy;
