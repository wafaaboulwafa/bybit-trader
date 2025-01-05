import TelegramBot from "node-telegram-bot-api";

const token = process.env.TELEGRAM_BOT_TOKEN || "";
const chatId = process.env.TELEGRAM_CHAT_ID || "";

console.log("Telgram token:" + token);
console.log("Telgram chatId:" + chatId);

const telegramBot = new TelegramBot(token, { polling: true });

//Telegram send message
const notifyTelegram = (message: string) =>
  telegramBot.sendMessage(chatId, message);

//Send telegram message when wallet is updated
export function notifyWalletUpdate(rec: any) {
  const message =
    "Wallet 💰" +
    "\r\n" +
    "Total Equity: " +
    parseFloat(rec.totalEquity).toFixed(2).toString() +
    "\r\n----------------\r\n";
  const assets = rec.coin.map(
    (r: any) => r.coin + ": " + parseFloat(r.usdValue).toFixed(2).toString()
  );

  const assetsMsg = assets.reduce(
    (accumulator: string, currentValue: string) =>
      accumulator + "\r\n" + currentValue,
    ""
  );

  notifyTelegram(message + assetsMsg);
}

//Send telegram message when order is created
export function notifyOrderUpdate(rec: any) {
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

//Send telegram message when order is executed
export function notifyExecutionUpdate(rec: any) {
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
