import emaCrossStrategy from "./emaCross";
import rsiEmaCrossStrategy from "./ResiEMACross";
import bbCrossStrategy from "./bbCross";
import { OnStrategyType } from "../service/types";
import wychoffStrategy from "./wychoff";
import defaultStrategy from "./default";

export default new Map<string, OnStrategyType>([
  ["default", defaultStrategy],
  ["emaCross", emaCrossStrategy],
  ["rsiEmaCross", rsiEmaCrossStrategy],
  ["bbCross", bbCrossStrategy],
  ["wychoff", wychoffStrategy],
]);
