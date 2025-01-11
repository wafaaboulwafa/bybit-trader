//import MarketRepo from "../repository/marketRepo";
//import PairRepo from "../repository/pairRepo";

require("dotenv").config();

import {
  marketLiveInstance,
  walletLiveInstance,
} from "../repository/instances";

(async () => {
  console.log(walletLiveInstance.getCoinAmount("USDT"));
  console.log(
    marketLiveInstance.getPair("DOGEUSDT")?.getTimeFrame("1")?.closePrice[0]
  );
})();
