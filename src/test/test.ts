import PairRepo from "../repository/pairRepo";
import wychoff from "../strategies/wychoff2";

require("dotenv").config();

const timeFrames = ["240", "5"];
const pairName = "BTCUSDT";
const baseCoin = "BTC";
const quoteCoin = "USDT";

setTimeout(async () => {
  const endDate = new Date();

  const pair = new PairRepo(
    pairName,
    timeFrames,
    "wychoff",
    baseCoin,
    quoteCoin,
    true,
    false,
    1,
    "percentOfEquity"
  );

  for (const timeFrmae of timeFrames) {
    const timeFrameRepo = pair.getTimeFrame(timeFrmae);
    if (!timeFrameRepo) continue;
    await timeFrameRepo.init(pair.pair, timeFrmae, pair.isFuture, endDate);
  }

  for (const timeFrmae of timeFrames) {
    const timeFrameRepo = pair.getTimeFrame(timeFrmae);
    if (!timeFrameRepo) continue;
    const currentPrice =
      timeFrameRepo.closePrice[timeFrameRepo.closePrice.length - 1];
    const candle = timeFrameRepo.candle[timeFrameRepo.closePrice.length - 1];
    wychoff(
      pair.pair,
      timeFrmae,
      currentPrice,
      candle,
      async () => {},
      async () => {},
      async () => {},
      async () => {},
      pair,
      false,
      false
    );
  }
}, 3000);
