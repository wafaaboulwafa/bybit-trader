"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const indicators_1 = require("../service/indicators");
const strategy = (pair, timeFrame, candles, closePrices, price, candle, buyPosition, sellPosition, closePositions) => {
    const rsiValue = (0, indicators_1.calcRsi)(closePrices);
    const macdValue = (0, indicators_1.calcMacd)(closePrices);
    const crossUpValue = (0, indicators_1.isEmaCrossUp)(closePrices);
    const crossDownValue = (0, indicators_1.isEmaCrossDown)(closePrices);
    const buySignal = rsiValue < 30 && macdValue.MACD && macdValue.MACD > 0 && crossUpValue;
    const sellSignal = rsiValue > 70 && macdValue.MACD && macdValue.MACD < 0 && crossDownValue;
    if (buySignal) {
        closePositions();
        buyPosition(0.25);
    }
    if (sellSignal) {
        closePositions();
        sellPosition(0.25);
    }
};
exports.default = strategy;
