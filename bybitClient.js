require("dotenv").config();

const { RestClientV5 } = require("bybit-api");
const { DefaultLogger, WS_KEY_MAP, WebsocketClient } = require("bybit-api");
const ms = require("ms");

const logger = {
  ...DefaultLogger,
  silly: (...params) => console.log("silly", ...params),
};

const wsClient = new WebsocketClient(
  {
    market: "v5",
  },
  logger
);

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
// wsClient.on('error', (data) => {
//   console.error('ws exception: ', data);
// });

const topics = ["kline.5.XRPUSDT", "kline.5.BTCUSDT", "kline.5.ETHUSDT"];

wsClient.subscribeV5(topics, "spot");

// To unsubscribe from topics (after a 5 second delay, in this example):
setTimeout(() => {
  console.log("unsubscribing");
  wsClient.unsubscribeV5("kline.5.ETHUSDT", "spot");
}, ms("5s"));

// Topics are tracked per websocket type
// Get a list of subscribed topics (e.g. for public v3 spot topics) (after a 5 second delay)
setTimeout(() => {
  const activePrivateTopics = wsClient
    .getWsStore()
    .getTopics(WS_KEY_MAP.v5Private);

  console.log("Active private v5 topics: ", activePrivateTopics);

  const activePublicLinearTopics = wsClient
    .getWsStore()
    .getTopics(WS_KEY_MAP.v5LinearPublic);
  console.log("Active public linear v5 topics: ", activePublicLinearTopics);

  const activePublicSpotTopis = wsClient
    .getWsStore()
    .getTopics(WS_KEY_MAP.v5SpotPublic);
  console.log("Active public spot v5 topics: ", activePublicSpotTopis);

  const activePublicOptionsTopics = wsClient
    .getWsStore()
    .getTopics(WS_KEY_MAP.v5OptionPublic);
  console.log("Active public option v5 topics: ", activePublicOptionsTopics);
}, ms("15s"));

//////////

const bybitClient = new RestClientV5({
  testnet: true,
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
