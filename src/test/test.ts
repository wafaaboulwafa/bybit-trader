import PairRepo from "../repository/pairRepo";
import wychoff from "../strategies/wychoff";

require("dotenv").config();

const timeFrames = ["240", "5"];
const pairName = "BTCUSDT";
const baseCoin = "BTC";
const quoteCoin = "USDT";

const testUTCDate = "2025-01-20T09:20:00Z";

setTimeout(async () => {
  const endDate = new Date(Date.parse(testUTCDate));

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

  const sortedFrames = [...timeFrames];
  sortedFrames.sort((a, b) => parseInt(a) - parseInt(b));

  let currentPrice: number = 0;
  for (const timeFrmae of sortedFrames) {
    const timeFrameRepo = pair.getTimeFrame(timeFrmae);
    if (!timeFrameRepo) continue;
    if (currentPrice === 0) currentPrice = timeFrameRepo?.closePrice[0];
    else {
      timeFrameRepo.closePrice[0] = currentPrice;
      timeFrameRepo.candle[0].closePrice = currentPrice;
    }
  }

  for (const timeFrmae of timeFrames) {
    const timeFrameRepo = pair.getTimeFrame(timeFrmae);
    if (!timeFrameRepo) continue;
    const currentPrice = timeFrameRepo.closePrice[0];
    const candle = timeFrameRepo.candle[0];
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
