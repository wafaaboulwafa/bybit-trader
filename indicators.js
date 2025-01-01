const {
  rsi,
  macd,
  sma,
  ema,
  bollingerbands,
  crossUp,
  crossDown,
} = require("technicalindicators");

function calcRsi(closePrices, period) {
  const values = rsi({ values: closePrices, period });
  const last = values[values.length - 1];
  return last;
}

function calcEma(closePrices, period) {
  const values = ema({ values: closePrices, period });
  const last = values[values.length - 1];
  return last;
}
function calcSma(closePrices, period) {
  const values = sma({ values: closePrices, period });
  const last = values[values.length - 1];
  return last;
}

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

function calcbollingerbands(closePrices, stdDev = 2, period = 26) {
  const values = bollingerbands({ values: closePrices, period, stdDev });
  const last = values[values.length - 1];
  return last;
}

function isEmaCrossUp(
  closePrices,
  fastEmaPeriod = 3,
  slowEmaPeriod = 4,
  limit = 4
) {
  const fastEmaValues = ema({ values: closePrices, period: fastEmaPeriod });
  const slowEmaValues = ema({ values: closePrices, period: slowEmaPeriod });

  fastLastElements = fastEmaValues.slice(Math.max(arr.length - limit, 0));
  slowLastElements = slowEmaValues.slice(Math.max(arr.length - limit, 0));

  return crossUp({ lineA: fastLastElements, lineA: slowLastElements });
}

function isEmaCrossDown(
  closePrices,
  fastEmaPeriod = 3,
  slowEmaPeriod = 4,
  limit = 4
) {
  const fastEmaValues = ema({ values: closePrices, period: fastEmaPeriod });
  const slowEmaValues = ema({ values: closePrices, period: slowEmaPeriod });

  fastLastElements = fastEmaValues.slice(Math.max(arr.length - limit, 0));
  slowLastElements = slowEmaValues.slice(Math.max(arr.length - limit, 0));

  return crossDown({ lineA: fastLastElements, lineA: slowLastElements });
}

module.exports = {
  rsi: calcRsi,
  ema: calcEma,
  sma: calcSma,
  macd: calcMacd,
  bollingerbands: calcbollingerbands,
  isEmaCrossUp,
  isEmaCrossDown,
};
