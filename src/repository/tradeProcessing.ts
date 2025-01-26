const sellPositionTriggered = new Map<string, boolean>();
const buyPositionTriggered = new Map<string, boolean>();
const pairProcessing = new Map<string, boolean>();

export const isSellTriggered = (symbol: string): boolean => {
  return sellPositionTriggered.get(symbol) === true;
};

export const clearSellTrigger = (symbol: string) => {
  sellPositionTriggered.set(symbol, false);
};

export const setSellTriggered = (symbol: string) => {
  sellPositionTriggered.set(symbol, true);
};

export const isBuyTriggered = (symbol: string): boolean => {
  return buyPositionTriggered.get(symbol) === true;
};

export const clearBuyTrigger = (symbol: string) => {
  buyPositionTriggered.set(symbol, false);
};

export const setBuyTriggered = (symbol: string) => {
  buyPositionTriggered.set(symbol, true);
};

export const isPairUnderProcessing = (symbol: string): boolean => {
  return pairProcessing.get(symbol) === true;
};

export const setPairUnderProcessing = (symbol: string) => {
  pairProcessing.set(symbol, true);
};

export const clearPairProcessing = (symbol: string) => {
  pairProcessing.set(symbol, false);
};
