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

export function getRoadToMillionRisk(amount: number): number {
  const risks = [
    { balance: 1000000.0, risk: 99990.0 },
    { balance: 900010.0, risk: 89991.0 },
    { balance: 810019.0, risk: 80991.9 },
    { balance: 729027.1, risk: 72892.71 },
    { balance: 656134.39, risk: 65603.44 },
    { balance: 590530.95, risk: 59043.1 },
    { balance: 531487.86, risk: 53138.79 },
    { balance: 478349.07, risk: 47824.91 },
    { balance: 430524.16, risk: 43042.42 },
    { balance: 387481.75, risk: 38738.17 },
    { balance: 348743.57, risk: 34864.36 },
    { balance: 313879.22, risk: 31377.92 },
    { balance: 282501.29, risk: 28240.13 },
    { balance: 254261.16, risk: 25416.12 },
    { balance: 228845.05, risk: 22874.5 },
    { balance: 205970.54, risk: 20587.05 },
    { balance: 185383.49, risk: 18528.35 },
    { balance: 166855.14, risk: 16675.51 },
    { balance: 150179.63, risk: 15007.96 },
    { balance: 135171.66, risk: 13507.17 },
    { balance: 121664.5, risk: 12156.45 },
    { balance: 109508.05, risk: 10940.8 },
    { balance: 98567.24, risk: 9846.72 },
    { balance: 88720.52, risk: 8862.05 },
    { balance: 79858.47, risk: 7975.85 },
    { balance: 71882.62, risk: 7178.26 },
    { balance: 64704.36, risk: 6460.44 },
    { balance: 58243.92, risk: 5814.39 },
    { balance: 52429.53, risk: 5232.95 },
    { balance: 47196.58, risk: 4709.66 },
    { balance: 42486.92, risk: 4238.69 },
    { balance: 38248.23, risk: 3814.82 },
    { balance: 34433.4, risk: 3433.34 },
    { balance: 31000.06, risk: 3090.01 },
    { balance: 27910.06, risk: 2781.01 },
    { balance: 25129.05, risk: 2502.91 },
    { balance: 22626.15, risk: 2252.61 },
    { balance: 20373.53, risk: 2027.35 },
    { balance: 18346.18, risk: 1824.62 },
    { balance: 16521.56, risk: 1642.16 },
    { balance: 14879.4, risk: 1477.94 },
    { balance: 13401.46, risk: 1330.15 },
    { balance: 12071.32, risk: 1197.13 },
    { balance: 10874.19, risk: 1077.42 },
    { balance: 9796.77, risk: 969.68 },
    { balance: 8827.09, risk: 872.71 },
    { balance: 7954.38, risk: 785.44 },
    { balance: 7168.94, risk: 706.89 },
    { balance: 6462.05, risk: 636.2 },
    { balance: 5825.84, risk: 572.58 },
    { balance: 5253.26, risk: 515.33 },
    { balance: 4737.93, risk: 463.79 },
    { balance: 4274.14, risk: 417.41 },
    { balance: 3856.73, risk: 375.67 },
    { balance: 3481.05, risk: 338.11 },
    { balance: 3142.95, risk: 304.29 },
    { balance: 2838.65, risk: 273.87 },
    { balance: 2564.79, risk: 246.48 },
    { balance: 2318.31, risk: 221.83 },
    { balance: 2096.48, risk: 199.65 },
    { balance: 1896.83, risk: 179.68 },
    { balance: 1717.15, risk: 161.71 },
    { balance: 1555.43, risk: 145.54 },
    { balance: 1409.89, risk: 130.99 },
    { balance: 1278.9, risk: 117.89 },
    { balance: 1161.01, risk: 106.1 },
    { balance: 1054.91, risk: 95.49 },
    { balance: 959.42, risk: 85.94 },
    { balance: 873.48, risk: 77.35 },
    { balance: 796.13, risk: 69.61 },
    { balance: 726.52, risk: 62.65 },
    { balance: 663.86, risk: 56.39 },
    { balance: 607.48, risk: 50.75 },
    { balance: 556.73, risk: 45.67 },
    { balance: 511.06, risk: 41.11 },
    { balance: 469.95, risk: 37.0 },
    { balance: 432.96, risk: 33.3 },
    { balance: 399.66, risk: 29.97 },
    { balance: 369.69, risk: 26.97 },
    { balance: 342.73, risk: 24.27 },
    { balance: 318.45, risk: 21.85 },
    { balance: 296.61, risk: 19.66 },
    { balance: 276.95, risk: 17.69 },
    { balance: 259.25, risk: 15.93 },
    { balance: 243.33, risk: 14.33 },
    { balance: 228.99, risk: 12.9 },
    { balance: 216.09, risk: 11.61 },
    { balance: 204.49, risk: 10.45 },
    { balance: 194.04, risk: 9.4 },
    { balance: 184.63, risk: 8.46 },
    { balance: 176.17, risk: 7.62 },
    { balance: 168.55, risk: 6.86 },
    { balance: 161.7, risk: 6.17 },
    { balance: 155.53, risk: 5.55 },
  ];

  risks.sort((a, b) => b.balance - a.balance);

  for (const rec of risks) {
    if (amount >= rec.balance) return rec.risk;
  }

  return 5;
}
