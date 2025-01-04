"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = startTradingBot;
const bybit_api_1 = require("bybit-api");
const telgramClient_1 = require("./telgramClient");
const tradingApi_1 = require("./tradingApi");
const indicators_1 = require("./indicators");
const pairs = require("../../constants/config.json");
//ByBit Socket client
const wsClient = new bybit_api_1.WebsocketClient({
    market: "v5",
    testnet: (process.env.BYBIT_API_TESTNET || "").toLowerCase() == "true",
    key: process.env.BYBIT_API_KEY,
    secret: process.env.BYBIT_API_SECRET,
});
//Close all socket connection when application shutdown
process.once("SIGINT", (code) => wsClient.closeAll(true));
process.once("SIGTERM", (code) => wsClient.closeAll(true));
function startTradingBot(onUpdate) {
    return __awaiter(this, void 0, void 0, function* () {
        //Hold all market candles in memory
        const marketCandles = new Map();
        //Load previous candles
        yield (0, tradingApi_1.loadSpotMarketCandles)(marketCandles);
        wsClient.on("update", (data) => {
            //On price update
            if (data.topic.startsWith("kline.")) {
                //Candle topic example: kline.5.BTCUSDT
                const reg = /^kline\.(.+)\.(.+)$/gi;
                const matches = reg.exec(data.topic);
                if (matches && matches.length > 2) {
                    const pairName = matches[2].toUpperCase();
                    const timeFrame = parseInt(matches[1]);
                    const pairKey = pairName + "." + timeFrame;
                    //Find if we are allowed to trade this pair
                    const pairInfo = pairs.find((r) => r.pair === pairName);
                    if (!pairInfo)
                        return;
                    if (!marketCandles.has(pairKey)) {
                        marketCandles.set(pairKey, {
                            name: pairName,
                            time: timeFrame,
                            candles: new Map(),
                        });
                    }
                    const pairData = marketCandles.get(pairKey);
                    if (!pairData)
                        return;
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
                        const closePrices = (0, indicators_1.getClosePrices)(pairData.candles);
                        //Create buy position
                        const buyPosition = (percentage) => {
                            (0, tradingApi_1.postBuySpotOrder)(pairInfo.pairName, pairInfo.buyCoin, candle.closePrice, percentage);
                        };
                        //Create sell position
                        const sellPosition = (percentage) => {
                            (0, tradingApi_1.postSellSpotOrder)(pairInfo.pairName, pairInfo.sellCoin, candle.closePrice, percentage);
                        };
                        //Liquidate all positions
                        const closePositions = () => {
                            (0, tradingApi_1.postSellSpotOrder)(pairInfo.pairName, pairInfo.sellCoin, candle.closePrice, 1);
                        };
                        const candles = Array.from(pairData.candles.values());
                        //Call strategy method
                        if (onUpdate) {
                            onUpdate(pairName, timeFrame, candles, closePrices, candle.closePrice, candle, buyPosition, sellPosition, closePositions);
                        }
                    }
                }
            }
            else if (data.topic === "execution") {
                //Telegram notification for order executed
                if (data.data.length > 0)
                    (0, telgramClient_1.notifyExecutionUpdate)(data.data[0]);
            }
            else if (data.topic === "order") {
                //Telegram notification for order created
                if (data.data.length > 0)
                    (0, telgramClient_1.notifyOrderUpdate)(data.data[0]);
            }
            else if (data.topic === "wallet") {
                //Telegram notification for wallet update
                if (data.data.length > 0)
                    (0, telgramClient_1.notifyWalletUpdate)(data.data[0]);
            }
        });
        //Create socket subscriptions
        const topics = pairs.map((r) => "kline." + r.time + "." + r.pair);
        wsClient.subscribeV5([...topics, "order", "execution", "wallet"], "spot");
    });
}
