require("dotenv").config();

const { RestClientV5 } = require("bybit-api");

const bybitClient = new RestClientV5({
  testnet: process.env.BYBIT_API_TESTNET.toLowerCase() == "true",
  key: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_API_SECRET,
});

bybitClient
  .getKline({
    category: "inverse",
    symbol: "BTCUSD",
    interval: "60",
    start: 1670601600000,
    end: 1670608800000,
  })
  .then((response) => {
    console.log(response);
  })
  .catch((error) => {
    console.error(error);
  });

bybitClient
  .getAllCoinsBalance({ accountType: "FUND", coin: "USDC" })
  .then((response) => {
    console.log(response);
  })
  .catch((error) => {
    console.error(error);
  });

module.exports = {};
