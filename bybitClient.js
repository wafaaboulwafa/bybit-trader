require("dotenv").config();

const crypto = require("crypto");
const axios = require("axios");

const API_SECRET = process.env.BYBIT_API_SECRET;
const API_KEY = process.env.BYBIT_API_KEY;

const API = "https://api-testnet.bybit.com";

const apiPost = (url, data) => {
  let recvWindow = 5000;
  let timestamp = Date.now().toString();
  const sign = crypto
    .createHmac("sha256", API_SECRET)
    .update(timestamp + API_KEY + recvWindow + data)
    .digest("hex");
  return axios.post(API + url, {
    headers: {
      "X-BAPI-SIGN-TYPE": "2",
      "X-BAPI-SIGN": sign,
      "X-BAPI-API-KEY": API_KEY,
      "X-BAPI-TIMESTAMP": timestamp,
      "X-BAPI-RECV-WINDOW": recvWindow.toString(),
    },
  });
};

const apiGet = (url) => {
  let recvWindow = 5000;
  let timestamp = Date.now().toString();
  const sign = crypto
    .createHmac("sha256", API_SECRET)
    .update(timestamp + API_KEY + recvWindow)
    .digest("hex");
  return axios.get(API + url, {
    headers: {
      "X-BAPI-SIGN-TYPE": "2",
      "X-BAPI-SIGN": sign,
      "X-BAPI-API-KEY": API_KEY,
      "X-BAPI-TIMESTAMP": timestamp,
      "X-BAPI-RECV-WINDOW": recvWindow.toString(),
    },
  });
};

// Fetch Account Balance
async function getBalance() {
  const response = await apiGet("/v2/private/wallet/balance");

  //console.log(response.data);

  return response.data.result.USDT.wallet_balance;
}

getBalance().then((v) => {
  console.log(v);
});
