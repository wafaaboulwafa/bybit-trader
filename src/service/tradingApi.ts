import { CandleType } from "./types";
import { KlineIntervalV3, RestClientV5 } from "bybit-api";
import { DateTime } from "luxon";

//ByBit rest client
export const restClient = new RestClientV5({
  testnet: (process.env.BYBIT_API_TESTNET || "").toLowerCase() == "true",
  demoTrading:
    (process.env.BYBIT_API_DEMO || "").toLowerCase() === "true"
      ? true
      : undefined,
  key: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_API_SECRET,
});
