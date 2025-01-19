import { OnStrategyType, PairConfigType } from "./types";
import {
  notifyWalletUpdate,
  notifyOrderUpdate,
  notifyExecutionUpdate,
} from "./telgramClient";
import { getMinutesBetweenDates, getPairsConfig } from "./misc";
import strategies from "../strategies";
import {
  walletLiveInstance as wallet,
  marketLiveInstance as marketInfo,
} from "../repository/instances";
import { createSocketClient } from "./bybitClient";

export default async function startTradingBot() {
  //Hold trans time
  let lastBuyTransTime: Date = new Date(0);
  let lastSellTransTime: Date = new Date(0);

  //ByBit Socket client
  const wsClient = createSocketClient();
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

        const pairData = marketInfo.getPair(pairName);

        if (!pairData) return;
        //Wait for candles to be loaded first
        if ((pairData.getTimeFrame(timeFrame)?.length || 0) === 0) return;

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
          const buyPosition = async (price: number) => {
            const diffInMinutes = getMinutesBetweenDates(
              new Date(),
              lastBuyTransTime
            );
            if (1 > diffInMinutes) return; //Protection from multiple requests

            console.log("Buy position ...");
            lastBuyTransTime = new Date();
            await pairData.postBuyOrder(price, pairData.risk);
          };

          //Create sell position
          const sellPosition = async (price: number) => {
            const diffInMinutes = getMinutesBetweenDates(
              new Date(),
              lastSellTransTime
            );
            if (1 > diffInMinutes) return; //Protection from multiple requests

            console.log("Sell position ...");
            lastSellTransTime = new Date();
            await pairData.postSellOrder(price, pairData.risk);
          };

          //Liquidate all positions
          const closeBuyPosition = async (price: number) => {
            if (pairData.isFuture)
              await pairData.closeOpenFuturePositions(price, false, true);
            else await pairData.postSellOrder(price, 1);
          };

          const closeSellPosition = async (price: number) => {
            if (pairData.isFuture)
              await pairData.closeOpenFuturePositions(price, true, false);
          };

          //Call strategy method
          const onStrategy: OnStrategyType | null =
            strategies.get(pairData.strategy) ||
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
              closeBuyPosition,
              closeSellPosition,
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
  const pairs: PairConfigType[] = getPairsConfig();
  for (let p of pairs) {
    for (let t of p.timeFrames) {
      topics.push("kline." + t + "." + p.pairName);
    }
  }
  wsClient
    .subscribeV5([...topics, "order", "execution", "wallet"], "linear")
    .catch((e) => console.warn(e));
}
