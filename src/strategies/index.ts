import { OnStrategyType } from "../service/types";
import defaultStrategy from "./default";
import bbCrossStrategy from "./bbCross";
import wychoffStrategy from "./wychoff";
import trendFollowerStrategy from "./trendFollower";

export default new Map<string, OnStrategyType>([
  ["default", defaultStrategy],
  ["bbCross", bbCrossStrategy],
  ["wychoff", wychoffStrategy],
  ["trendFollower", trendFollowerStrategy],
]);
