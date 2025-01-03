const {
  rsi,
  macd,
  sma,
  ema,
  bollingerbands,
  crossUp,
  crossDown,
} = require("technicalindicators");

//Get last rsi value
function calcRsi(closePrices, period = 14) {
  const values = rsi({ values: closePrices, period });
  const last = values[values.length - 1];
  return last;
}

//get last exponential moving average value
function calcEma(closePrices, period = 20) {
  const values = ema({ values: closePrices, period });
  const last = values[values.length - 1];
  return last;
}

//get last simple moving average value
function calcSma(closePrices, period = 20) {
  const values = sma({ values: closePrices, period });
  const last = values[values.length - 1];
  return last;
}

//Get last macd value
function calcMacd(
  closePrices,
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
) {
  const values = macd({
    values: closePrices,
    fastPeriod,
    slowPeriod,
    signalPeriod,
  });
  const last = values[values.length - 1];
  return last;
}

//Get last bollinger band value
function calcbollingerbands(closePrices, stdDev = 2, period = 26) {
  const values = bollingerbands({ values: closePrices, period, stdDev });
  const last = values[values.length - 1];
  return last;
}

//Is two ema crossing up
function isEmaCrossUp(
  closePrices,
  fastEmaPeriod = 3,
  slowEmaPeriod = 4,
  limit = 4
) {
  const fastEmaValues = ema({ values: closePrices, period: fastEmaPeriod });
  const slowEmaValues = ema({ values: closePrices, period: slowEmaPeriod });

  fastLastElements = fastEmaValues.slice(
    Math.max(fastEmaValues.length - limit, 0)
  );
  slowLastElements = slowEmaValues.slice(
    Math.max(slowEmaValues.length - limit, 0)
  );

  return (
    fastLastElements[0] > slowLastElements[0] &&
    fastLastElements[limit] < slowLastElements[limit]
  );
}

//Is two ema crossing down
function isEmaCrossDown(
  closePrices,
  fastEmaPeriod = 3,
  slowEmaPeriod = 4,
  limit = 4
) {
  const fastEmaValues = ema({ values: closePrices, period: fastEmaPeriod });
  const slowEmaValues = ema({ values: closePrices, period: slowEmaPeriod });

  fastLastElements = fastEmaValues.slice(
    Math.max(fastEmaValues.length - limit, 0)
  );
  slowLastElements = slowEmaValues.slice(
    Math.max(slowEmaValues.length - limit, 0)
  );

  return (
    fastLastElements[0] < slowLastElements[0] &&
    fastLastElements[limit] > slowLastElements[limit]
  );
}

//Convert candles set to clsoing price array
function getClosePrices(candles) {
  const canndlesArray = Array.from(candles.values());
  canndlesArray.sort((a, b) => a.startTime - b.startTime);
  const closePrices = canndlesArray.map((r) => r.closePrice);
  return closePrices;
}

module.exports = {
  rsi: calcRsi,
  ema: calcEma,
  sma: calcSma,
  macd: calcMacd,
  bollingerbands: calcbollingerbands,
  isEmaCrossUp,
  isEmaCrossDown,
  getClosePrices,
};
