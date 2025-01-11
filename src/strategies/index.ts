import emaCrossStrategy from "./emaCross";
import rsiEmaCrossStrategy from "./rsiEmaCross";
import bbCrossStrategy from "./bbCross";
import { OnStrategyType } from "../service/types";
import wychoffStrategy from "./wychoff";
import defaultStrategy from "./default";

export default new Map<string, OnStrategyType>([
  ["default", defaultStrategy],
  ["bbCross", bbCrossStrategy],
  ["wychoff", wychoffStrategy],
  // ["emaCross", emaCrossStrategy],
  // ["rsiEmaCross", rsiEmaCrossStrategy],
]);
