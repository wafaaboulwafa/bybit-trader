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

const createSocketClient = () => {
  return new WebsocketClient({
    market: "v5",
    testnet:
      (
        process.env.SOCKET_BYBIT_API_TESTNET ||
        process.env.BYBIT_API_TESTNET ||
        ""
      ).toLowerCase() == "true",
    demoTrading:
      (
        process.env.SOCKET_BYBIT_API_DEMO ||
        process.env.BYBIT_API_DEMO ||
        ""
      ).toLowerCase() === "true"
        ? true
        : undefined,
    key: process.env.SOCKET_BYBIT_API_KEY || process.env.BYBIT_API_KEY,
    secret: process.env.SOCKET_BYBIT_API_SECRET || process.env.BYBIT_API_SECRET,
  });
};

const restClient = createApiClient();

export { createApiClient, createSocketClient, restClient };
