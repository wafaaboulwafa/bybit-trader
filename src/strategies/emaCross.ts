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

  const crossUpValue = isEmaCrossUp(timeRepo.closePrice);
  const crossDownValue = isEmaCrossDown(timeRepo.closePrice);

  if (crossUpValue === undefined || crossDownValue === undefined) return;

  const buySignal = crossUpValue;
  const sellSignal = crossDownValue;
  const emaPrice = calcEma(timeRepo.closePrice, 5);

  if (buySignal && emaPrice) {
    closeSellPostion(0);
    buyPosition(emaPrice, 0.1);
  }

  if (sellSignal && emaPrice) {
    closeBuyPosition(0);
    sellPosition(emaPrice, 0.1);
  }
};

export default strategy;
