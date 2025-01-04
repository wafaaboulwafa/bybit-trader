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
  buyPosition: (percentage: number) => void,
  sellPosition: (percentage: number) => void,
  closePositions: () => void
) => void;
