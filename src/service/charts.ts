import { BacktestAssetValueType, CandleType } from "./types";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { RSI, EMA, BollingerBands } from "technicalindicators";
import { ChartConfiguration } from "chart.js";
import {} from "chartjs-chart-financial"; // Import the financial chart plugin

// Generate Candlestick Chart with Indicators
async function generateChartWithIndicators(
  width: number = 800,
  height: number = 600,
  symbol: string,
  data: CandleType[]
): Promise<Buffer<ArrayBufferLike>> {
  const rsiPeriod = 14;
  const emaPeriod = 20;
  const bbPeriod = 20;

  const closes = data.map((d) => d.closePrice);
  const times = data.map((d) => d.startTime.toISOString());

  // Calculate Indicators
  const ema = EMA.calculate({ period: emaPeriod, values: closes });
  const rsi = RSI.calculate({ period: rsiPeriod, values: closes });
  const bb = BollingerBands.calculate({
    period: bbPeriod,
    values: closes,
    stdDev: 2,
  });

  // Fill Missing Data for Indicators
  const extendedEma = Array(data.length - ema.length)
    .fill(null)
    .concat(ema);
  const extendedRsi = Array(data.length - rsi.length)
    .fill(null)
    .concat(rsi);
  const extendedBb = Array(data.length - bb.length)
    .fill(null)
    .concat(bb);

  // Extract Bollinger Bands
  const bbUpper = extendedBb.map((b) => (b ? b.upper : null));
  const bbLower = extendedBb.map((b) => (b ? b.lower : null));
  const bbMiddle = extendedBb.map((b) => (b ? b.middle : null));

  const canvasRenderService = new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: "white",
    plugins: {
      modern: ["chartjs-chart-financial"],
    },
  });

  const configuration: ChartConfiguration = {
    type: "candlestick",
    data: {
      labels: times,
      datasets: [
        // Candlestick Dataset
        {
          label: `${symbol} Candlesticks`,
          data: data.map((d) => ({
            x: d.key,
            o: d.openPrice,
            h: d.highPrice,
            l: d.lowPrice,
            c: d.closePrice,
          })),
          type: "candlestick",
        },
        // EMA
        {
          label: `EMA (${emaPeriod})`,
          data: extendedEma,
          borderColor: "blue",
          fill: false,
          type: "line",
        },
        // Bollinger Bands
        {
          label: "BB Upper",
          data: bbUpper,
          borderColor: "green",
          fill: "-1",
        },
        {
          label: "BB Middle",
          data: bbMiddle,
          borderColor: "orange",
          fill: false,
        },
        {
          label: "BB Lower",
          data: bbLower,
          borderColor: "red",
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          type: "time",
        },
        y: {
          beginAtZero: false,
        },
      },
    },
    // plugins: {
    //   subtitle: {
    //     text: `${symbol} with Indicators`,
    //   },
    // },
  };

  const imageBuffer = await canvasRenderService.renderToBuffer(configuration);
  return imageBuffer;
}

// Generate Candlestick Chart
export async function generateChart(
  width: number = 800,
  height: number = 600,
  symbol: string,
  data: CandleType[]
): Promise<Buffer<ArrayBufferLike>> {
  const labels = data.map((d) => d.startTime.toISOString().slice(11, 16));

  const canvasRenderService = new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: "white",
  });

  const configuration: ChartConfiguration = {
    type: "candlestick",
    data: {
      labels: labels,
      datasets: [
        {
          label: `${symbol} Candlesticks`,
          data: data.map((d, i) => ({
            x: d.key,
            o: d.openPrice,
            h: d.highPrice,
            l: d.lowPrice,
            c: d.closePrice,
          })),
          borderColor: "#007bff",
          backgroundColor: "rgba(0, 123, 255, 0.5)",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        // xAxes: [{ type: "time", distribution: "series" }],
        // yAxes: [{ ticks: { beginAtZero: false } }],
      },
    },
  };

  const imageBuffer = await canvasRenderService.renderToBuffer(configuration);
  return imageBuffer;
}

// Generate Assets Chart
export async function generateAssetChart(
  width: number = 800,
  height: number = 600,
  data: BacktestAssetValueType[]
): Promise<Buffer<ArrayBufferLike>> {
  const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: "white",
  });
  // Extract time and values for plotting
  const labels = data.map((r) => r.time.toString());
  const values = data.map((r) => r.value);

  const configuration: ChartConfiguration = {
    type: "line",
    data: {
      labels: labels, // Time points
      datasets: [
        {
          label: "Asset Value Over Time",
          data: values, // Asset values
          borderColor: "blue",
          backgroundColor: "rgba(0, 0, 255, 0.2)",
          fill: true,
          tension: 0.4, // Smoother line
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: true },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Time",
          },
        },
        y: {
          title: {
            display: true,
            text: "Asset Value",
          },
          beginAtZero: false,
        },
      },
    },
  };

  // Render the chart as a buffer
  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  return imageBuffer;
}
