require("dotenv").config();

const axios = require("axios");
const WebSocket = require("ws");
const nodemailer = require("nodemailer");
const { RSI, MACD } = require("technicalindicators");
const fs = require("fs");

const API_KEY = process.env.BYBIT_API_KEY;
const PAIRS = process.env.TRADE_PAIRS.split(",");
const INTERVAL = "1m";
const RSI_PERIOD = 14;
const BALANCE_API = "https://api.bybit.com/v2/private/wallet/balance";
const ORDER_API = "https://api.bybit.com/v2/private/order/create";
const LOG_FILE = "trade_log.txt";

// Telegram Config
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// WebSocket URL
const WS_URL = "wss://stream.bybit.com/v5/public/linear";

let ws;
let marketData = {};

// Connect WebSocket
function connectWebSocket() {
  ws = new WebSocket(WS_URL);

  ws.on("open", () => {
    log("WebSocket Connected.");
    PAIRS.forEach((pair) => {
      const msg = {
        op: "subscribe",
        args: [`kline.${INTERVAL}.${pair}`],
      };
      ws.send(JSON.stringify(msg));
    });
  });

  ws.on("message", (data) => {
    const response = JSON.parse(data);
    if (response.data && response.topic.includes("kline")) {
      const pair = response.topic.split(".")[2];
      marketData[pair] = response.data[0];
    }
  });

  ws.on("close", () => {
    log("WebSocket Disconnected. Reconnecting...");
    setTimeout(connectWebSocket, 5000);
  });

  ws.on("error", (error) => {
    log(`WebSocket Error: ${error.message}`);
    setTimeout(connectWebSocket, 5000);
  });
}

// Fetch Account Balance
async function getBalance() {
  const response = await axios.get(BALANCE_API, {
    headers: { "X-BYBIT-API-KEY": API_KEY },
  });
  return response.data.result.USDT.wallet_balance;
}

// Calculate Indicators
function calculateIndicators(closePrices) {
  return {
    rsi: RSI.calculate({ values: closePrices, period: RSI_PERIOD }),
    macd: MACD.calculate({
      values: closePrices,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
    }),
  };
}

// Place Order
async function placeOrder(pair, side, qty, price) {
  const order = {
    api_key: API_KEY,
    symbol: pair,
    side,
    order_type: "Market",
    qty,
    time_in_force: "GoodTillCancel",
    timestamp: Date.now(),
  };

  try {
    const response = await axios.post(ORDER_API, order);
    const result = response.data.result;

    // Fetch updated balance
    const newBalance = await getBalance();

    const msg =
      `${side} Order for ${pair}:\n` +
      `Amount: ${qty}\nPrice: ${price}\n` +
      `New Balance: $${newBalance.toFixed(2)}`;

    log(msg);
    await sendTelegram(msg);
  } catch (error) {
    log(`Order Error: ${error.message}`);
    await sendTelegram(`Order Failed: ${error.message}`);
  }
}

// Trading Logic
async function trade() {
  const balance = await getBalance();
  const buyAmount = balance * 0.25;

  for (const pair of PAIRS) {
    const data = marketData[pair];
    if (!data) continue;

    const closePrices = data.kline.map((c) => parseFloat(c.close));
    const { rsi, macd } = calculateIndicators(closePrices);
    const latestRSI = rsi[rsi.length - 1];
    const latestMACD = macd[macd.length - 1];
    const currentPrice = closePrices[closePrices.length - 1];

    if (latestRSI < 30 && latestMACD.histogram > 0) {
      const qty = (buyAmount / currentPrice).toFixed(3);
      await placeOrder(pair, "Buy", qty, currentPrice);
    } else if (latestRSI > 70 && latestMACD.histogram < 0) {
      await placeOrder(pair, "Sell", "100%", currentPrice);
    }
  }
}

// Log Helper
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage);
}

// Send Telegram Notification
async function sendTelegram(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message });
}

// Start Bot
connectWebSocket();
setInterval(trade, 60000); // Run every minute
