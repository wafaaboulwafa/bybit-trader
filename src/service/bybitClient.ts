import { RestClientV5, WebsocketClient } from "bybit-api";

//ByBit rest client
const createApiClient = () => {
  return new RestClientV5({
    testnet:
      (
        process.env.REST_BYBIT_API_TESTNET ||
        process.env.BYBIT_API_TESTNET ||
        ""
      ).toLowerCase() == "true",
    demoTrading:
      (
        process.env.REST_BYBIT_API_DEMO ||
        process.env.BYBIT_API_DEMO ||
        ""
      ).toLowerCase() === "true"
        ? true
        : undefined,
    key: process.env.REST_BYBIT_API_KEY || process.env.BYBIT_API_KEY,
    secret: process.env.REST_BYBIT_API_SECRET || process.env.BYBIT_API_SECRET,
  });
};

//ByBit socket client
const createSocketClient = (settings: "PRICES" | "WALLET") => {
  const testNet =
    (settings === "PRICES"
      ? process.env.SOCKET_BYBIT_API_TESTNET
      : process.env.REST_BYBIT_API_TESTNET) ||
    process.env.BYBIT_API_TESTNET ||
    "";

  const demoTrading =
    (settings === "PRICES"
      ? process.env.SOCKET_BYBIT_API_DEMO
      : process.env.REST_BYBIT_API_DEMO) ||
    process.env.BYBIT_API_DEMO ||
    "";

  const key =
    (settings === "PRICES"
      ? process.env.SOCKET_BYBIT_API_KEY
      : process.env.REST_BYBIT_API_KEY) || process.env.BYBIT_API_KEY;

  const secret =
    (settings === "PRICES"
      ? process.env.SOCKET_BYBIT_API_SECRET
      : process.env.REST_BYBIT_API_SECRET) || process.env.BYBIT_API_SECRET;

  return new WebsocketClient({
    market: "v5",
    testnet: testNet.toLowerCase() === "true",
    demoTrading: demoTrading.toLowerCase() === "true" ? true : undefined,
    key: key,
    secret: secret,
  });
};

//Rest instance
const restClient = createApiClient();

export { createApiClient, createSocketClient, restClient };
