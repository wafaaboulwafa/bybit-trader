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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seralizeMarketDataFiles = seralizeMarketDataFiles;
const tradingApi_1 = require("./tradingApi");
const fs_1 = __importDefault(require("fs"));
const pairs = require("../../constants/config.json");
const startBalance = 1000;
function startTradingBot(onUpdate) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const marketCandles = new Map();
        yield deseralizeMarketDataFiles(marketCandles);
        const assets = {
            USD: startBalance,
        };
        //Starting assets
        console.log(assets);
        for (let pair of pairs) {
            const marketInfo = marketCandles.get(pair.pairName + "." + pair.timeFrame);
            const candles = ((marketInfo === null || marketInfo === void 0 ? void 0 : marketInfo.candles) && Array.from((_a = marketInfo === null || marketInfo === void 0 ? void 0 : marketInfo.candles) === null || _a === void 0 ? void 0 : _a.values())) || [];
            candles.sort((a, b) => b.key - a.key);
            const accumulatedCandles = [];
            const accumulatedClosePrices = [];
            for (const candle of candles) {
                accumulatedCandles.push(candle);
                accumulatedClosePrices.push(candle.closePrice);
                const buyPosition = (percentage) => { };
                const sellPosition = (percentage) => {
                    //
                };
                const closePositions = () => {
                    //
                };
                if (onUpdate) {
                    onUpdate(pair.pairName, pair.timeFrame, accumulatedCandles, accumulatedClosePrices, candle.closePrice, candle, buyPosition, sellPosition, closePositions);
                }
            }
        }
        //End assets
        console.log(assets);
    });
}
const backtestFilePath = "./../../constants/backtestData.json";
function seralizeMarketDataFiles() {
    return __awaiter(this, void 0, void 0, function* () {
        const data = [];
        for (const pair of pairs) {
            const candlesSet = new Map();
            yield (0, tradingApi_1.loadPairSpotMarketCandles)(candlesSet, pair.pairName, pair.timeFrame);
            const candles = Array.from(candlesSet.values());
            data.push({ pair: pair.pairName, time: pair.timeFrame, candles });
        }
        if (fs_1.default.existsSync(backtestFilePath))
            fs_1.default.unlinkSync(backtestFilePath);
        const jsonString = JSON.stringify(data, null, 2);
        yield fs_1.default.writeFileSync(backtestFilePath, jsonString, {});
    });
}
function deseralizeMarketDataFiles(marketCandles) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!fs_1.default.existsSync(backtestFilePath))
            return;
        marketCandles.clear();
        const fileContent = require(backtestFilePath);
        for (let pair of fileContent.entries()) {
            const marketInfo = {
                name: pair === null || pair === void 0 ? void 0 : pair.name,
                time: parseInt(pair === null || pair === void 0 ? void 0 : pair.time),
                candles: new Map(),
            };
            for (let candle of pair.candles.entries()) {
                marketInfo.candles.set(candle.key, candle);
            }
            marketCandles.set(marketInfo.name, marketInfo);
        }
    });
}
exports.default = startTradingBot;
