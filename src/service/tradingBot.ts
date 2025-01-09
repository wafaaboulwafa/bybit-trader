import {
  CandleType,
  MarketDataType,
  OnStrategyType,
  PairConfigType,
} from "./types";
import { WebsocketClient } from "bybit-api";
import {
  notifyWalletUpdate,
  notifyOrderUpdate,
  notifyExecutionUpdate,
} from "./telgramClient";
import { getMinutesBetweenDates } from "./misc";
import strategies from "../strategies";
import wallet from "../repository/walletRepo";
import PairRepo from "../repository/pairRepo";

export default async function startTradingBot() {
  const pairs: PairConfigType[] = require("../../constants/config.json");
  const marketInfo = new Map<string, PairRepo>();

  //Hold trans time
  let lastBuyTransTime: Date = new Date(0);
  let lastSellTransTime: Date = new Date(0);

  //ByBit Socket client
  const wsClient = new WebsocketClient({
    market: "v5",
    testnet: (process.env.BYBIT_API_TESTNET || "").toLowerCase() == "true",
    demoTrading:
      (process.env.BYBIT_API_DEMO || "").toLowerCase() === "true"
        ? true
        : undefined,
    key: process.env.BYBIT_API_KEY,
    secret: process.env.BYBIT_API_SECRET,
  });

  //Close all socket connection when application shutdown
  process.once("SIGINT", () => wsClient.closeAll(true));
  process.once("SIGTERM", () => wsClient.closeAll(true));

  wsClient.on("update", (data: any) => {
    //On price update
    if (data.topic.startsWith("kline.")) {
      //Candle topic example: kline.5.BTCUSDT
      const reg = /^kline\.(.+)\.(.+)$/gi;
      const matches = reg.exec(data.topic);
      if (matches && matches.length > 2) {
        const pairName = matches[2].toUpperCase();
        const timeFrame: string = matches[1];
        //Find if we are allowed to trade this pair
        const pairInfo = pairs.find((r) => r.pairName === pairName);

        if (!pairInfo) return;

        if (!marketInfo.has(pairName)) {
          marketInfo.set(
            pairName,
            new PairRepo(
              pairName,
              pairInfo.timeFrames,
              pairInfo.strategy,
              pairInfo.baseCoin,
              pairInfo.quotationCoin
            )
          );
        }

        const pairData = marketInfo.get(pairName);
        if (!pairData) return;

        for (let r of data.data) {
          //Create candle
          const candle = {
            key: r.start,
            startTime: new Date(parseInt(r.start)),
            openPrice: parseFloat(r.open),
            highPrice: parseFloat(r.high),
            lowPrice: parseFloat(r.low),
            closePrice: parseFloat(r.close),
          };

          pairData.addCandle(timeFrame, candle);

          //Create buy position
          const buyPosition = (price: number, percentage: number) => {
            const diffInMinutes = getMinutesBetweenDates(
              new Date(),
              lastBuyTransTime
            );
            if (1 > diffInMinutes) return; //Protection from multiple requests

            console.log("Buy position ...");
            lastBuyTransTime = new Date();
            pairData.postBuySpotOrder(price, percentage);
          };

          //Create sell position
          const sellPosition = (price: number, percentage: number) => {
            const diffInMinutes = getMinutesBetweenDates(
              new Date(),
              lastSellTransTime
            );
            if (1 > diffInMinutes) return; //Protection from multiple requests

            console.log("Sell position ...");
            lastSellTransTime = new Date();
            pairData.postSellSpotOrder(price, percentage);
          };

          //Liquidate all positions
          const closePositions = (price: number) => {
            pairData.postSellSpotOrder(price, 1);
          };

          //Call strategy method
          const onStrategy: OnStrategyType | null =
            strategies.get(pairInfo.strategy) ||
            strategies.get("default") ||
            null;

          if (onStrategy) {
            onStrategy(
              pairName,
              timeFrame,
              candle.closePrice,
              candle,
              buyPosition,
              sellPosition,
              closePositions,
              pairData
            );
          }
        }
      }
    } else if (data.topic === "execution") {
      //Telegram notification for order executed
      if (data.data.length > 0) notifyExecutionUpdate(data.data[0]);
    } else if (data.topic === "order") {
      //Telegram notification for order created
      if (data.data.length > 0) notifyOrderUpdate(data.data[0]);
    } else if (data.topic === "wallet") {
      //Telegram notification for wallet update
      if (data.data.length > 0) {
        wallet.setCoinAmount(data.data[0].coin, data.data[0].totalEquity);
        notifyWalletUpdate(data.data[0]);
      }
    }
  });

  //Create socket subscriptions
  const topics = [];
  for (let p of pairs) {
    for (let t of p.timeFrames) {
      topics.push("kline." + t + "." + p.pairName);
    }
  }
  wsClient.subscribeV5([...topics, "order", "execution", "wallet"], "spot");
}
