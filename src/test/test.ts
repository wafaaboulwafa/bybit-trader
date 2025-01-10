import { rsi } from "technicalindicators";
import TimeFrameRepo from "../repository/timeFrameRepo";
import startHttpServer from "../service/tradingViewNotify";

require("dotenv").config();
// import {
//   getEquity,
//   loadSpotMarketCandles,
//   cancelSpotOrders,
//   getCoinBalance,
//   postBuySpotOrder,
//   postSellSpotOrder,
//   getSpotFeesRate,
// } from "./../service/tradingApi";
// import { getClosePrices } from "./../service/indicators";

//getEquity().then((r) => console.log(r));

//postTrade("BTCUSDT", 66583.28, "Buy", 1).then((r) => console.log(r));

//cancelOrders("BTCUSDT").then((r) => console.log(r));

//getCoinBalance("BTC").then((r) => console.log(r));

//postBuyOrder("BTCUSDT", "USDT", 83754.65, 1).then((r) => console.log(r));

//postSellOrder("BTCUSDT", "BTC", 108722.26, 1).then((r) => console.log(r));

//getFeesRate("BTCUSDT", "USDT").then((r) => console.log(r));
let x = new TimeFrameRepo();
x.addCandle({
  key: 1,
  startTime: new Date(),
  highPrice: 100,
  lowPrice: 1,
  closePrice: 50,
  openPrice: 40,
});

x.addCandle({
  key: 1,
  startTime: new Date(),
  highPrice: 100,
  lowPrice: 1,
  closePrice: 50,
  openPrice: 40,
});

x.addCandle({
  key: 1,
  startTime: new Date(),
  highPrice: 100,
  lowPrice: 1,
  closePrice: 50,
  openPrice: 40,
});

x.addCandle({
  key: 1,
  startTime: new Date(),
  highPrice: 100,
  lowPrice: 1,
  closePrice: 50,
  openPrice: 40,
});

//const res = rsi({ values: x.closePrice, period: 2 });
//x.closePrice[1];

console.log(x.closePrice[0]);
//console.log(res);
console.log(x.ohlc4[0]);
console.log(x.candle[0]);

startHttpServer();
