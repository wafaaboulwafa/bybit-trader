import { OnStrategyType } from "../service/types";
import { calcEma, calcRsi } from "../service/indicators";
import { takeLast } from "../service/misc";

const strategy: OnStrategyType = async (
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
