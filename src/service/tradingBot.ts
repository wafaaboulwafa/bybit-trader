import {
  CandleType,
  MarketDataType,
  OnUpdateType,
  PairConfigType,
} from "./types";
import { WebsocketClient } from "bybit-api";
import {
  notifyWalletUpdate,
  notifyOrderUpdate,
  notifyExecutionUpdate,
} from "./telgramClient";
import {
  getMinutesBetweenDates,
  loadSpotMarketCandles,
  postBuySpotOrder,
  postSellSpotOrder,
} from "./tradingApi";
import { getClosePrices } from "./indicators";

export default async function startTradingBot(onUpdate: OnUpdateType) {
  const pairs: PairConfigType[] = require("../../constants/config.json");

  //Hold trans time
  let lastBuyTransTime: Date = new Date(0);
  let lastSellTransTime: Date = new Date(0);

  //ByBit Socket client
  const wsClient = new WebsocketClient({
    market: "v5",
    testnet: (process.env.BYBIT_API_TESTNET || "").toLowerCase() == "true",
    key: process.env.BYBIT_API_KEY,
    secret: process.env.BYBIT_API_SECRET,
  });

  //Close all socket connection when application shutdown
  process.once("SIGINT", () => wsClient.closeAll(true));
  process.once("SIGTERM", () => wsClient.closeAll(true));

  //Hold all market candles in memory
  const marketCandles = new Map<string, MarketDataType>();
  //Load previous candles
  await loadSpotMarketCandles(marketCandles);

  wsClient.on("update", (data: any) => {
    //On price update
    if (data.topic.startsWith("kline.")) {
      //Candle topic example: kline.5.BTCUSDT
      const reg = /^kline\.(.+)\.(.+)$/gi;
      const matches = reg.exec(data.topic);
      if (matches && matches.length > 2) {
        const pairName = matches[2].toUpperCase();
        const timeFrame: number = parseInt(matches[1]);
        const pairKey = pairName + "." + timeFrame;
        //Find if we are allowed to trade this pair
        const pairInfo = pairs.find((r) => r.pairName === pairName);

        if (!pairInfo) return;

        if (!marketCandles.has(pairKey)) {
          marketCandles.set(pairKey, {
            name: pairName,
            time: timeFrame,
            candles: new Map(),
          });
        }

        const pairData = marketCandles.get(pairKey);
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

          pairData.candles.set(candle.key, candle);

          //Generate close prices array for indicators
          const closePrices = getClosePrices(pairData.candles);

          //Create buy position
          const buyPosition = (price: number, percentage: number) => {
            const diffInMinutes = getMinutesBetweenDates(
              new Date(),
              lastBuyTransTime
            );
            if (1 > diffInMinutes) return; //Protection from multiple requests

            console.log("Buy position ...");
            postBuySpotOrder(
              pairInfo.pairName,
              pairInfo.buyCoin,
              price,
              percentage
            );
            lastBuyTransTime = new Date();
          };

          //Create sell position
          const sellPosition = (price: number, percentage: number) => {
            const diffInMinutes = getMinutesBetweenDates(
              new Date(),
              lastSellTransTime
            );
            if (1 > diffInMinutes) return; //Protection from multiple requests

            console.log("Sell position ...");
            postSellSpotOrder(
              pairInfo.pairName,
              pairInfo.sellCoin,
              price,
              percentage
            );
            lastSellTransTime = new Date();
          };

          //Liquidate all positions
          const closePositions = (price: number) => {
            postSellSpotOrder(pairInfo.pairName, pairInfo.sellCoin, price, 1);
          };

          const candles: CandleType[] = Array.from(pairData.candles.values());

          //Call strategy method
          if (onUpdate) {
            onUpdate(
              pairName,
              timeFrame,
              candles,
              closePrices,
              candle.closePrice,
              candle,
              buyPosition,
              sellPosition,
              closePositions
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
      if (data.data.length > 0) notifyWalletUpdate(data.data[0]);
    }
  });

  //Create socket subscriptions
  const topics = pairs.map((r) => "kline." + r.timeFrame + "." + r.pairName);
  wsClient.subscribeV5([...topics, "order", "execution", "wallet"], "spot");
}
