require("dotenv").config();

import startHttpServer from "./../service/tradingViewNotify";
import startNotificationBot from "./../service/notificationBot";

import {
  marketLiveInstance as marketRepo,
  walletLiveInstance as walletRepo,
  positionsLiveInstance as positionRepo,
} from "../repository/instances";
import { calculateZigZag } from "../service/indicators";
import { takeLast } from "../service/misc";

// Run socket bot
startNotificationBot();
startHttpServer();

setTimeout(async () => {
  const pairName = "DOGEUSDT";

  const pair = marketRepo.getPair(pairName);
  const timeFrame = pair?.getTimeFrame("240");
  const zigzag = calculateZigZag(timeFrame?.candle || []);

  console.log(zigzag.slice(0, 4));

  //console.log(takeLast(zigzag, 5, 0));
}, 3000);
