require("dotenv").config();

const { WebsocketClient } = require("bybit-api");
const pairs = require("./pairs");

const wsClient = new WebsocketClient({
  market: "v5",
  testnet: process.env.BYBIT_API_TESTNET.toLowerCase() == "true",
  key: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_API_SECRET,
});

process.once("SIGINT", function (code) {
  console.log("SIGINT received...");
  wsClient.closeAll(true);
});

process.once("SIGTERM", function (code) {
  console.log("SIGTERM received...");
  wsClient.closeAll(true);
});

wsClient.on("update", (data) => {
  console.log("raw message received ", JSON.stringify(data));
});

wsClient.on("open", (data) => {
  console.log("connection opened open:", data.wsKey);
});
wsClient.on("response", (data) => {
  console.log("log response: ", JSON.stringify(data, null, 2));
});
wsClient.on("reconnect", ({ wsKey }) => {
  console.log("ws automatically reconnecting.... ", wsKey);
});
wsClient.on("reconnected", (data) => {
  console.log("ws has reconnected ", data?.wsKey);
});

const topics = pairs.map((r) => "kline." + r.time + "." + r.name);

wsClient.subscribeV5(topics, "spot");
wsClient.subscribeV5("position", "spot");
wsClient.subscribeV5("execution", "spot");
wsClient.subscribeV5(["order", "wallet", "greeks"], "spot");

// wsClient.on('error', (data) => {
//   console.error('ws exception: ', data);
// });

//module.exports = {};
