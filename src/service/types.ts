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
  closePositions: (price: number) => void,
  pairData: PairRepo
) => void;

export type PairConfigType = {
  pairName: string;
  strategy: string;
  timeFrames: KlineIntervalV3[];
  baseCoin: string;
  quotationCoin: string;
  isFuture: boolean;
};
