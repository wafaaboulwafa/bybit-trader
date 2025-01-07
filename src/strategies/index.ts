import emaCrossStrategy from "./emaCross";
import rsiEmaCrossStrategy from "./RsiEMACross";
import bbCrossStrategy from "./bbCross";
import { OnUpdateType } from "../service/types";

export default new Map<string, OnUpdateType>([
  ["default", emaCrossStrategy],
  ["emaCross", emaCrossStrategy],
  ["rsiEmaCross", rsiEmaCrossStrategy],
  ["bbCross", bbCrossStrategy],
]);
