require("dotenv").config();
const {
  getBalance,
  getMarketCandles,
  postTrade,
  cancelOrders,
  getCoinBalance,
} = require("./tradingApi");
const { getClosePrices } = require("./indicators");

getBalance().then((r) => console.log(r));

//postTrade("BTCUSDT", 66583.28, "Buy", 1).then((r) => console.log(r));

//cancelOrders("BTCUSDT").then((r) => console.log(r));

//getCoinBalance("BTC").then((r) => console.log(r));
