require("dotenv").config();
import {
  getEquity,
  loadSpotMarketCandles,
  cancelSpotOrders,
  getCoinBalance,
  postBuySpotOrder,
  postSellSpotOrder,
  getSpotFeesRate,
} from "./../service/tradingApi";
import { getClosePrices } from "./../service/indicators";

//getEquity().then((r) => console.log(r));

//postTrade("BTCUSDT", 66583.28, "Buy", 1).then((r) => console.log(r));

//cancelOrders("BTCUSDT").then((r) => console.log(r));

//getCoinBalance("BTC").then((r) => console.log(r));

//postBuyOrder("BTCUSDT", "USDT", 83754.65, 1).then((r) => console.log(r));

//postSellOrder("BTCUSDT", "BTC", 108722.26, 1).then((r) => console.log(r));

//getFeesRate("BTCUSDT", "USDT").then((r) => console.log(r));
