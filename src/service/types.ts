import { KlineIntervalV3 } from "bybit-api";
import PairRepo from "../repository/pairRepo";

export type CandleType = {
  key: number;
  startTime: Date;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
};

export type OnStrategyType = (
  pairName: string,
  timeFrame: string,
  closePrice: number,
  candle: CandleType,
  buyPosition: (
    price: number,
    takeProfit?: number | undefined,
    stopLoss?: number | undefined
  ) => Promise<void>,
  sellPosition: (
    price: number,
    takeProfit?: number | undefined,
    stopLoss?: number | undefined
  ) => Promise<void>,
  closeBuyPosition: (price: number) => Promise<void>,
  closeSellPosition: (price: number) => Promise<void>,
  pairData: PairRepo,
  hasSellPositions: boolean,
  hasBuyPositions: boolean
) => void;

export type RiskMethodType =
  | "percentOfEquity"
  | "fixedAmount"
  | "fixedQty"
  | "roadToMillion";

export type PairConfigType = {
  pairName: string;
  strategy: string;
  timeFrames: KlineIntervalV3[];
  baseCoin: string;
  quotationCoin: string;
  isFuture: boolean;
  invert: boolean;
  riskAmount: number;
  riskMethod: RiskMethodType;
};

export type BacktestTimeFrameType = {
  timeFrame: string;
  data: CandleType[];
};
export type BacktestPairType = {
  pairName: string;
  timeFrames: BacktestTimeFrameType[];
};

export type BacktestDataType = BacktestPairType[];

export type BacktestCandleType = {
  pairName: string;
  timeFrame: string;
  candle: CandleType;
};

export type BacktestAssetValueType = {
  time: Date;
  value: number;
};

export type ZigZagPoint = {
  value: number;
  type: "High" | "Low";
  index: number;
};

export type PositionType = {
  id: number;
  symbol: string;
  side: "Buy" | "Sell";
  qty: number;
  takeProfit: number | undefined;
  stopLoss: number | undefined;
  pnl: number;
  createdTime: Date;
  entryPrice: number;
};

export type NotifyRequestType = {
  pair: string;
  price: number | undefined;
  action: "buy" | "sell" | "closeBuy" | "closeSell" | "closeAll";
  takeProfit: number | undefined;
  stopLoss: number | undefined;
};
