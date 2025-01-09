export type CandleType = {
  key: number;
  startTime: Date;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
};

export type MarketDataType = {
  name: string;
  time: number;
  candles: Map<number, CandleType>;
};

export type OnStrategyType = (
  pairName: string,
  timeFrame: string,
  closePrice: number,
  candle: CandleType,
  buyPosition: (price: number, percentage: number) => void,
  sellPosition: (price: number, percentage: number) => void,
  closePositions: (price: number) => void,
  pairData: MarketDataType
) => void;

export type PairConfigType = {
  pairName: string;
  strategy: string;
  timeFrames: string[];
  baseCoin: string;
  quotationCoin: string;
};
