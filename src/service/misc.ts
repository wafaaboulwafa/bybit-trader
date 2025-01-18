import { CandleType, PairConfigType } from "./types";
import fs from "fs";
import path from "path";

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

export function saveBuffer(filePath: string, buffer: Buffer) {
  const fileAbsPath = path.resolve(__dirname, filePath);
  if (fs.existsSync(fileAbsPath)) fs.unlinkSync(fileAbsPath);
  fs.writeFileSync(fileAbsPath, buffer, { flush: true });
}

export function takeLast<T>(
  data: Array<T>,
  size: number,
  shift: number
): Array<T> {
  const takeSize = Math.min(data.length, size);
  return data.slice(data.length - (takeSize + shift), data.length - shift);
}

export function getPairsConfig(): PairConfigType[] {
  let filePath = process.env.CONFIG_PATH || "../../config.json";
  if (filePath.startsWith("./") || filePath.startsWith("../"))
    filePath = path.resolve(__dirname, filePath);
  if (!fs.existsSync(filePath)) return [];
  const result: PairConfigType[] = require(filePath);
  return result;
}
