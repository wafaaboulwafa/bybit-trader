import { CandleType, OnStrategyType } from "./types";
import strategies from "../strategies";
import WalletRepo from "../repository/walletRepo";
import MarketRepo from "../repository/marketRepo";
import BacktestRepo from "../repository/backtestRepo";

const startBalance = 1000;

async function startTradingBot() {
  const backtestRepo = new BacktestRepo();
  backtestRepo.init();

  const marketRepo = new MarketRepo();
  marketRepo.init(false);
  const wallet = new WalletRepo();
  wallet.setCoinAmount("USDT", startBalance);
  backtestRepo.rest();

  let buyTrades = 0;
  let sellTrades = 0;

  console.log("---------------------------------------------");
  console.log(`Start wallet`, wallet);

  while (backtestRepo.more) {
    const backtestCandle = backtestRepo.nextCandle;
    if (!backtestCandle) break;
    const pairRepo = marketRepo.getPair(backtestCandle.pairName);
    if (!pairRepo) break;
    const pairName = backtestCandle.pairName;
    const timeFrame = backtestCandle.timeFrame;

    const candle = backtestCandle.candle;

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

      const timeRepo = pairRepo.getTimeFrame(timeFrame);
      if (timeRepo) timeRepo.addCandle(printCandle);

      const buyPosition = (price: number, percentage: number) => {
        let quoteCoinBalanace =
          wallet.getCoinAmount(pairRepo.quotationCoin) || 0;
        let baseCoinBalanace = wallet.getCoinAmount(pairRepo.baseCoin) || 0;

        if (quoteCoinBalanace > 0) {
          const buyAmount = quoteCoinBalanace * percentage;
          quoteCoinBalanace = quoteCoinBalanace - buyAmount;
          const qty = buyAmount / price;
          baseCoinBalanace = baseCoinBalanace + qty;

          wallet.setCoinAmount(pairRepo.quotationCoin, quoteCoinBalanace);
          wallet.setCoinAmount(pairRepo.baseCoin, baseCoinBalanace);

          const message = `[Buy] Price: ${price}, Qty: ${qty}, Date: ${printCandle.startTime}`;
          console.log(message);
          buyTrades++;
        }
      };

      const sellPosition = (price: number, percentage: number) => {
        let quoteCoinBalanace =
          wallet.getCoinAmount(pairRepo.quotationCoin) || 0;
        let baseCoinBalanace = wallet.getCoinAmount(pairRepo.baseCoin) || 0;

        if (baseCoinBalanace > 0) {
          const sellAmount = baseCoinBalanace * percentage;
          baseCoinBalanace = baseCoinBalanace - sellAmount;
          quoteCoinBalanace = quoteCoinBalanace + sellAmount * price;

          wallet.setCoinAmount(pairRepo.quotationCoin, quoteCoinBalanace);
          wallet.setCoinAmount(pairRepo.baseCoin, baseCoinBalanace);

          const message = `[Sell] Price: ${price}, Qty: ${sellAmount}, Wallet: ${quoteCoinBalanace}, Date: ${printCandle.startTime}`;
          console.log(message);
          sellTrades++;
        }
      };

      const closePositions = (price: number) => {
        sellPosition(price, 1);
      };

      //Strategy method
      const onUpdate: OnStrategyType | null =
        strategies.get(pairRepo?.strategy || "") ||
        strategies.get("default") ||
        null;

      if (onUpdate) {
        onUpdate(
          pairName,
          timeFrame,
          price,
          printCandle,
          buyPosition,
          sellPosition,
          closePositions,
          pairRepo
        );
      }

      //Close all positions at the end
      if (!backtestRepo.more) closePositions(price);
    }
  }

  //Print backtest result
  const finalBalance = wallet.getCoinAmount("USDT") || 0;

  console.log("Wallet:", wallet);
  console.log("Sell trades", sellTrades);
  console.log("Buy trades", buyTrades);
  console.log(
    "Balance growth",
    Math.round((finalBalance * 100) / startBalance) + " %"
  );
  console.log("---------------------------------------------");
}

export default startTradingBot;
