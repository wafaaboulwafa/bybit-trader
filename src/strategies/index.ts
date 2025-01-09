import emaCrossStrategy from "./emaCross";
import rsiEmaCrossStrategy from "./RsiEMACross";
import bbCrossStrategy from "./bbCross";
import { OnStrategyType } from "../service/types";

export default new Map<string, OnStrategyType>([
  ["default", emaCrossStrategy],
  ["emaCross", emaCrossStrategy],
  ["rsiEmaCross", rsiEmaCrossStrategy],
  ["bbCross", bbCrossStrategy],
]);
