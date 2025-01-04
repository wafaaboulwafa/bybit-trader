"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcRsi = calcRsi;
exports.calcEma = calcEma;
exports.calcSma = calcSma;
exports.calcMacd = calcMacd;
exports.calcbollingerbands = calcbollingerbands;
exports.isEmaCrossUp = isEmaCrossUp;
exports.isEmaCrossDown = isEmaCrossDown;
exports.getClosePrices = getClosePrices;
const technicalindicators_1 = require("technicalindicators");
//Get last rsi value
function calcRsi(closePrices, period = 14) {
    const values = (0, technicalindicators_1.rsi)({ values: closePrices, period });
    const last = values[values.length - 1];
    return last;
}
//get last exponential moving average value
function calcEma(closePrices, period = 20) {
    const values = (0, technicalindicators_1.ema)({ values: closePrices, period });
    const last = values[values.length - 1];
    return last;
}
//get last simple moving average value
function calcSma(closePrices, period = 20) {
    const values = (0, technicalindicators_1.sma)({ values: closePrices, period });
    const last = values[values.length - 1];
    return last;
}
//Get last macd value
function calcMacd(closePrices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const values = (0, technicalindicators_1.macd)({
        values: closePrices,
        fastPeriod,
        slowPeriod,
        signalPeriod,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
    });
    const last = values[values.length - 1];
    return last;
}
//Get last bollinger band value
function calcbollingerbands(closePrices, stdDev = 2, period = 26) {
    const values = (0, technicalindicators_1.bollingerbands)({ values: closePrices, period, stdDev });
    const last = values[values.length - 1];
    return last;
}
//Is two ema crossing up
function isEmaCrossUp(closePrices, fastEmaPeriod = 3, slowEmaPeriod = 4, limit = 4) {
    const fastEmaValues = (0, technicalindicators_1.ema)({ values: closePrices, period: fastEmaPeriod });
    const slowEmaValues = (0, technicalindicators_1.ema)({ values: closePrices, period: slowEmaPeriod });
    const fastLastElements = fastEmaValues.slice(Math.max(fastEmaValues.length - limit, 0));
    const slowLastElements = slowEmaValues.slice(Math.max(slowEmaValues.length - limit, 0));
    return (fastLastElements[0] > slowLastElements[0] &&
        fastLastElements[limit] < slowLastElements[limit]);
}
//Is two ema crossing down
function isEmaCrossDown(closePrices, fastEmaPeriod = 3, slowEmaPeriod = 4, limit = 4) {
    const fastEmaValues = (0, technicalindicators_1.ema)({ values: closePrices, period: fastEmaPeriod });
    const slowEmaValues = (0, technicalindicators_1.ema)({ values: closePrices, period: slowEmaPeriod });
    const fastLastElements = fastEmaValues.slice(Math.max(fastEmaValues.length - limit, 0));
    const slowLastElements = slowEmaValues.slice(Math.max(slowEmaValues.length - limit, 0));
    return (fastLastElements[0] < slowLastElements[0] &&
        fastLastElements[limit] > slowLastElements[limit]);
}
//Convert candles set to clsoing price array
function getClosePrices(candles) {
    const canndlesArray = Array.from(candles.values());
    canndlesArray.sort((a, b) => a.key - b.key);
    const closePrices = canndlesArray.map((r) => r.closePrice);
    return closePrices;
}
