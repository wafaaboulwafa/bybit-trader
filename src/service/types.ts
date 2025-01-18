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
  buyPosition: (price: number, percentage: number) => void,
  sellPosition: (price: number, percentage: number) => void,
  closeBuyPosition: (price: number) => void,
  closeSellPosition: (price: number) => void,
  pairData: PairRepo
) => void;

export type PairConfigType = {
  pairName: string;
  strategy: string;
  timeFrames: KlineIntervalV3[];
  baseCoin: string;
  quotationCoin: string;
  isFuture: boolean;
  invert: boolean;
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
