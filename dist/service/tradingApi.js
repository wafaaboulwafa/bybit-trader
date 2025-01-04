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
exports.loadPairSpotMarketCandles = loadPairSpotMarketCandles;
exports.loadSpotMarketCandles = loadSpotMarketCandles;
exports.getEquity = getEquity;
exports.cancelSpotOrders = cancelSpotOrders;
exports.getCoinBalance = getCoinBalance;
exports.getSpotFeesRate = getSpotFeesRate;
exports.postBuySpotOrder = postBuySpotOrder;
exports.postSellSpotOrder = postSellSpotOrder;
const bybit_api_1 = require("bybit-api");
const luxon_1 = require("luxon");
const pairs = require("../../constants/config.json");
//ByBit rest client
const restClient = new bybit_api_1.RestClientV5({
    testnet: (process.env.BYBIT_API_TESTNET || "").toLowerCase() == "true",
    key: process.env.BYBIT_API_KEY,
    secret: process.env.BYBIT_API_SECRET,
});
function loadPairSpotMarketCandles(candlesSet_1, pair_1) {
    return __awaiter(this, arguments, void 0, function* (candlesSet, pair, timeFrame = 1, start = null, end = null) {
        candlesSet.clear();
        let endDate = end === null ? luxon_1.DateTime.now() : null;
        let startDate = start === null && endDate !== null
            ? endDate.minus({ years: 2 })
            : start !== null
                ? luxon_1.DateTime.fromJSDate(start)
                : null;
        let moreData = true;
        while (moreData) {
            let pairResponse = yield restClient.getKline({
                category: "spot",
                symbol: pair,
                interval: timeFrame.toString(),
                end: (startDate && startDate.valueOf()) || 0,
                start: (endDate && endDate.valueOf()) || 0,
                limit: 1000,
            });
            const candles = pairResponse.result.list.map((r) => ({
                key: r[0],
                startTime: new Date(parseInt(r[0])),
                openPrice: parseFloat(r[1]),
                highPrice: parseFloat(r[2]),
                lowPrice: parseFloat(r[3]),
                closePrice: parseFloat(r[4]),
            }));
            let maxCandleDate = 0;
            for (let candle of candles) {
                candlesSet.set(candle.key, candle);
                if (candle.key > maxCandleDate)
                    maxCandleDate = candle.key;
            }
            startDate = luxon_1.DateTime.fromMillis(maxCandleDate);
            moreData = (endDate && endDate.diff(startDate, "days").days > 2) || false;
        }
    });
}
//Get candles history for spot pair
function loadSpotMarketCandles(candlesSet) {
    return __awaiter(this, void 0, void 0, function* () {
        const now = luxon_1.DateTime.now();
        for (let rec of pairs) {
            let pairResponse = yield restClient.getKline({
                category: "spot",
                symbol: rec.pairName,
                interval: rec.timeFrame.toString(),
                end: now.valueOf(),
                start: now.minus({ months: 1 }).valueOf(),
                limit: 1000,
            });
            const candles = pairResponse.result.list.map((r) => ({
                key: r[0],
                startTime: new Date(parseInt(r[0])),
                openPrice: parseFloat(r[1]),
                highPrice: parseFloat(r[2]),
                lowPrice: parseFloat(r[3]),
                closePrice: parseFloat(r[4]),
            }));
            candlesSet.set(rec.pairName.toUpperCase() + "." + rec.timeFrame, {
                name: rec.pairName.toUpperCase(),
                time: rec.timeFrame,
                candles: new Map(candles.map((r) => [r.key, r])),
            });
        }
    });
}
//Get equity total value for unified account
function getEquity() {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield restClient
            .getWalletBalance({
            accountType: "UNIFIED",
        })
            .then((r) => {
            const coins = r.result.list.find((x) => (x.accountType = "UNIFIED"));
            if (coins)
                return coins.totalEquity;
            return 0;
        });
        return response;
    });
}
//Cancel all spot pending orders for a pair
function cancelSpotOrders(pair) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield restClient
            .cancelAllOrders({
            category: "spot",
            symbol: pair,
        })
            .then((r) => r.result.success);
        return response;
    });
}
//Get coin balance for unified account
function getCoinBalance(coin) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield restClient
            .getWalletBalance({
            accountType: "UNIFIED",
        })
            .then((r) => {
            const coins = r.result.list.find((n) => (n.accountType = "UNIFIED"));
            if (coins && coins.coin.length > 0) {
                const coinRec = coins.coin.find((n) => n.coin.toLowerCase() === coin.toLowerCase());
                if (coinRec)
                    return coinRec.equity;
            }
            return 0;
        });
        return response;
    });
}
//Get spot fees rate for a coin
function getSpotFeesRate(symbol, coin) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield restClient
            .getFeeRate({
            category: "spot",
            symbol,
            baseCoin: coin,
        })
            .then((r) => {
            const feesRec = r.result.list[0];
            return {
                takerFeeRate: parseFloat((feesRec === null || feesRec === void 0 ? void 0 : feesRec.takerFeeRate) || 0),
                makerFeeRate: parseFloat((feesRec === null || feesRec === void 0 ? void 0 : feesRec.makerFeeRate) || 0),
            };
        });
        return response;
    });
}
//Create a spot buy order
function postBuySpotOrder(pair_1) {
    return __awaiter(this, arguments, void 0, function* (pair, coin = "USDT", price, percentage = 1) {
        yield cancelSpotOrders(pair);
        const balance = yield getCoinBalance(coin);
        const fullQty = balance / price;
        const buyQty = fullQty * percentage;
        const feesRate = yield getSpotFeesRate(pair, coin);
        const rate = price > 0 ? feesRate.takerFeeRate : feesRate.makerFeeRate;
        const fees = buyQty * rate;
        const response = yield restClient
            .submitOrder({
            category: "spot",
            symbol: pair,
            orderType: price > 0 ? "Limit" : "Market",
            price: price > 0 ? price.toString() : undefined,
            qty: (buyQty - fees).toFixed(6).toString(),
            side: "Buy",
            timeInForce: "GTC",
        })
            .then((r) => r.result.orderId);
        return response;
    });
}
//Create a spot sell order
function postSellSpotOrder(pair_1, coin_1, price_1) {
    return __awaiter(this, arguments, void 0, function* (pair, coin, price, percentage = 1) {
        yield cancelSpotOrders(pair);
        const fullQty = yield getCoinBalance(coin);
        const sellQty = fullQty * percentage;
        const feesRate = yield getSpotFeesRate(pair, coin);
        const rate = price > 0 ? feesRate.takerFeeRate : feesRate.makerFeeRate;
        const fees = sellQty * rate;
        const response = yield restClient
            .submitOrder({
            category: "spot",
            symbol: pair,
            orderType: price > 0 ? "Limit" : "Market",
            price: price > 0 ? price.toString() : undefined,
            qty: (sellQty - fees).toFixed(6).toString(),
            side: "Sell",
            timeInForce: "GTC",
        })
            .then((r) => r.result.orderId);
        return response;
    });
}
