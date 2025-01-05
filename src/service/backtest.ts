import { loadPairSpotMarketCandles } from "./tradingApi";
import fs from "fs";
import path from "path";
import {
  CandleType,
  MarketDataType,
  OnUpdateType,
  PairConfigType,
} from "./types";

const pairs: PairConfigType[] = require("../../constants/config.json");
const backtestFilePath = "../../constants/backtestData.json";

const startBalance = 1000;

async function startTradingBot(onUpdate: OnUpdateType) {
  const marketCandles = new Map<string, MarketDataType>();
  await deseralizeMarketDataFiles(marketCandles);

  const coinStartBalance = startBalance;

  const wallet = {
    sellCoinBalanace: coinStartBalance,
    buyCoinBalance: 0,
  };
  let buyTrades = 0;
  let sellTrades = 0;

  //Starting assets
  console.log("Start wallet", wallet);

  for (let pair of pairs) {
    const marketInfo = marketCandles.get(pair.pairName + "." + pair.timeFrame);

    const candles =
      (marketInfo?.candles && Array.from(marketInfo?.candles?.values())) || [];
    candles.sort((a, b) => b.key - a.key);

    const accumulatedCandles: CandleType[] = [];
    const accumulatedClosePrices: number[] = [];

    for (const candle of candles) {
      accumulatedCandles.push(candle);
      accumulatedClosePrices.push(candle.closePrice);

      const ohlc = [
        candle.openPrice,
        candle.highPrice,
        candle.lowPrice,
        candle.closePrice,
      ];

      const printCandle: CandleType = {
        ...candle,
        lowPrice: candle.openPrice,
        highPrice: candle.openPrice,
        closePrice: candle.openPrice,
      };

      for (const [index, price] of ohlc.entries()) {
        if (index === 1) printCandle.highPrice = price;
        else if (index === 2) printCandle.lowPrice = price;
        else if (index === 3) printCandle.closePrice = price;

        const buyPosition = (percentage: number) => {
          if (wallet.buyCoinBalance > 0) {
            const buyAmount = wallet.buyCoinBalance * percentage;
            wallet.buyCoinBalance = wallet.buyCoinBalance - buyAmount;
            const qty = buyAmount / price;
            wallet.sellCoinBalanace = wallet.sellCoinBalanace + qty;

            const message = `Buy transaction: Price: ${price}, Qty: ${qty}`;
            console.log(message);
            buyTrades++;
          }
        };

        const sellPosition = (percentage: number) => {
          if (wallet.sellCoinBalanace > 0) {
            const sellAmount = wallet.sellCoinBalanace * percentage;
            wallet.sellCoinBalanace = wallet.sellCoinBalanace - sellAmount;
            wallet.buyCoinBalance = wallet.buyCoinBalance + sellAmount * price;

            const message = `Sell transaction: Price: ${price}, Qty: ${sellAmount}`;
            console.log(message);
            sellTrades++;
          }
        };

        const closePositions = () => {
          sellPosition(1);
        };

        if (onUpdate) {
          onUpdate(
            pair.pairName,
            pair.timeFrame,
            accumulatedCandles,
            accumulatedClosePrices,
            price,
            printCandle,
            buyPosition,
            sellPosition,
            closePositions
          );
        }

        //Close all positions at the end
        const isLastCandle =
          candles[candles.length - 1] === candle && index === 3;
        if (isLastCandle) closePositions();
      }
    }
  }

  //Print backtest result
  console.log("Wallet:", wallet);
  console.log("Sell trades", sellTrades);
  console.log("Buy trades", buyTrades);
  console.log(
    "Balance growth",
    Math.round((wallet.sellCoinBalanace * 100) / coinStartBalance) + " %"
  );
}

export async function seralizeMarketDataFiles() {
  const data = [];

  for (const pair of pairs) {
    const candlesSet = new Map<number, CandleType>();
    await loadPairSpotMarketCandles(candlesSet, pair.pairName, pair.timeFrame);
    const candles = Array.from(candlesSet.values());
    data.push({ pair: pair.pairName, time: pair.timeFrame, candles });
  }
  const filePath = path.resolve(__dirname, backtestFilePath);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  const jsonString = JSON.stringify(data, null, 2);
  await fs.writeFileSync(filePath, jsonString, { flush: true });
}

async function deseralizeMarketDataFiles(
  marketCandles: Map<string, MarketDataType>
) {
  if (!fs.existsSync(backtestFilePath)) return;

  marketCandles.clear();
  const fileContent = require(backtestFilePath);

  for (let pair of fileContent.entries()) {
    const marketInfo: MarketDataType = {
      name: pair?.name,
      time: parseInt(pair?.time),
      candles: new Map<number, CandleType>(),
    };

    for (let candle of pair.candles.entries()) {
      marketInfo.candles.set(candle.key, candle);
    }

    marketCandles.set(marketInfo.name, marketInfo);
  }
}

export default startTradingBot;
