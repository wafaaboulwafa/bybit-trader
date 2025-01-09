import { CandleType } from "./types";

export function getMinutesBetweenDates(date1: Date, date2: Date) {
  const diffInMs = date1.valueOf() - date2.valueOf();
  const diffInMinutes = Math.floor(diffInMs / 60000); // 60000 ms in a minute
  return diffInMinutes;
}

export function countDecimalDigits(input: string) {
  const reg = /\.(\d+)/gi;
  const res = reg.exec(input);
  if (res && res.length === 2) return res[1].length;
  else return 0;
}

//Convert candles set to clsoing price array
export function getClosePrices(candles: Map<number, CandleType>): number[] {
  const canndlesArray = Array.from(candles.values());
  canndlesArray.sort((a, b) => a.key - b.key);
  const closePrices = canndlesArray.map((r) => r.closePrice);
  return closePrices;
}
