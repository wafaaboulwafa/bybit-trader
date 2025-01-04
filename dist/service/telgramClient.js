"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyWalletUpdate = notifyWalletUpdate;
exports.notifyOrderUpdate = notifyOrderUpdate;
exports.notifyExecutionUpdate = notifyExecutionUpdate;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const token = process.env.TELEGRAM_BOT_TOKEN || "";
const chatId = process.env.TELEGRAM_CHAT_ID || "";
const telegramBot = new node_telegram_bot_api_1.default(token, { polling: true });
//Telegram send message
const notifyTelegram = (message) => telegramBot.sendMessage(chatId, message);
//Send telegram message when wallet is updated
function notifyWalletUpdate(rec) {
    const message = "Wallet 💰" +
        "\r\n" +
        "Total Equity: " +
        parseFloat(rec.totalEquity).toFixed(2).toString() +
        "\r\n----------------\r\n";
    const assets = rec.coin.map((r) => r.coin + ": " + parseFloat(r.usdValue).toFixed(2).toString());
    const assetsMsg = assets.reduce((accumulator, currentValue) => accumulator + "\r\n" + currentValue, "");
    notifyTelegram(message + assetsMsg);
}
//Send telegram message when order is created
function notifyOrderUpdate(rec) {
    const sideEmoji = rec.side.toLowerCase() === "sell" ? "🔻" : "🔺";
    const message = "Order [" +
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
function notifyExecutionUpdate(rec) {
    const sideEmoji = rec.side.toLowerCase() === "sell" ? "🔻" : "🔺";
    const message = "Order Executed ✅\r\n----------------\r\n" +
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
