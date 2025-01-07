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

export type OnUpdateType = (
  pairName: string,
  timeFrame: number,
  candles: CandleType[],
  closePrices: number[],
  closePrice: number,
  candle: CandleType,
  buyPosition: (price: number, percentage: number) => void,
  sellPosition: (price: number, percentage: number) => void,
  closePositions: (price: number) => void
) => void;

export type PairConfigType = {
  pairName: string;
  timeFrame: number;
  buyCoin: string;
  sellCoin: string;
};
