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

  for (let pair of pairs) {
    const coinStartBalance = startBalance;

    const wallet = {
      sellCoinBalanace: coinStartBalance,
      buyCoinBalance: 0,
    };
    let buyTrades = 0;
    let sellTrades = 0;

    //Starting assets
    console.log("---------------------------------------------");
    console.log(`Start wallet - Pair ${pair.pairName}`, wallet);

    const marketInfo = marketCandles.get(pair.pairName + "." + pair.timeFrame);

    const candles =
      (marketInfo?.candles && Array.from(marketInfo?.candles?.values())) || [];
    candles.sort((a, b) => a.key - b.key);

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
        printCandle.closePrice = price;
        if (index === 1) printCandle.highPrice = price;
        else if (index === 2) printCandle.lowPrice = price;

        const buyPosition = (percentage: number) => {
          if (wallet.sellCoinBalanace > 0) {
            const buyAmount = wallet.sellCoinBalanace * percentage;
            wallet.sellCoinBalanace = wallet.sellCoinBalanace - buyAmount;
            const qty = buyAmount / price;
            wallet.buyCoinBalance = wallet.buyCoinBalance + qty;

            const message = `[Buy] Price: ${price}, Qty: ${qty}, Date: ${printCandle.startTime}`;
            console.log(message);
            buyTrades++;
          }
        };

        const sellPosition = (percentage: number) => {
          if (wallet.buyCoinBalance > 0) {
            const sellAmount = wallet.buyCoinBalance * percentage;
            wallet.buyCoinBalance = wallet.buyCoinBalance - sellAmount;
            wallet.sellCoinBalanace =
              wallet.sellCoinBalanace + sellAmount * price;

            const message = `[Sell] Price: ${price}, Qty: ${sellAmount}, Wallet: ${wallet.sellCoinBalanace}, Date: ${printCandle.startTime}`;
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

    //Print backtest result
    console.log("Wallet:", wallet);
    console.log("Sell trades", sellTrades);
    console.log("Buy trades", buyTrades);
    console.log(
      "Balance growth",
      Math.round((wallet.sellCoinBalanace * 100) / coinStartBalance) + " %"
    );
    console.log("---------------------------------------------");
  }
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

  console.log(`Saving load test data to file ${filePath}`);
}

async function deseralizeMarketDataFiles(
  marketCandles: Map<string, MarketDataType>
) {
  const filePath = path.resolve(__dirname, backtestFilePath);
  if (!fs.existsSync(filePath)) return;

  marketCandles.clear();
  const fileContent = require(filePath);

  for (let pair of fileContent) {
    const marketInfo: MarketDataType = {
      name: pair?.pair,
      time: parseInt(pair?.time),
      candles: new Map<number, CandleType>(),
    };

    for (let candle of pair.candles) {
      marketInfo.candles.set(candle.key, candle);
    }
    marketCandles.set(marketInfo.name + "." + marketInfo.time, marketInfo);
  }
}

export default startTradingBot;
