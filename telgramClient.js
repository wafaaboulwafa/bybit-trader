const TelegramBot = require("node-telegram-bot-api");
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

const telegramBot = new TelegramBot(token, { polling: true });

const notifyTelegram = (message) => telegramBot.sendMessage(chatId, message);

function notifyWalletUpdate(rec) {
  const message =
    "Wallet 💰" +
    "\r\n" +
    "Total Equity: " +
    parseFloat(rec.totalEquity).toFixed(2).toString() +
    "\r\n----------------\r\n";
  const assets = rec.coin.map(
    (r) => r.coin + ": " + parseFloat(r.usdValue).toFixed(2).toString()
  );

  const assetsMsg = assets.reduce(
    (accumulator, currentValue) => accumulator + "\r\n" + currentValue,
    ""
  );

  notifyTelegram(message + assetsMsg);
}

function notifyOrderUpdate(rec) {
  const sideEmoji = rec.side.toLowerCase() === "sell" ? "🔻" : "🔺";
  const message =
    "Order [" +
    rec.orderStatus +
    "] ⏳\r\n----------------\r\n" +
    "Symbol: " +
    rec.symbol +
    "\r\nType:" +
    rec.side +
    " " +
    sideEmoji;

  notifyTelegram(message);
}

function notifyExecutionUpdate(rec) {
  const sideEmoji = rec.side.toLowerCase() === "sell" ? "🔻" : "🔺";
  const message =
    "Order Executed ✅\r\n----------------\r\n" +
    "Symbol: " +
    rec.symbol +
    "\r\nType:" +
    rec.side +
    " " +
    sideEmoji +
    "\r\nPrice: " +
    parseFloat(rec.execPrice).toFixed(2).toString() +
    "\r\n" +
    "Quantity: " +
    rec.execQty +
    "\r\nValue: " +
    parseFloat(rec.execValue).toFixed(2).toString();

  notifyTelegram(message);
}

module.exports = {
  notifyTelegram,
  notifyWalletUpdate,
  notifyOrderUpdate,
  notifyExecutionUpdate,
};
