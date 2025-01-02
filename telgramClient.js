const TelegramBot = require("node-telegram-bot-api");
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

const telegramBot = new TelegramBot(token, { polling: true });

const notifyTelegram = (message) => telegramBot.sendMessage(chatId, message);

module.exports = { notifyTelegram };
