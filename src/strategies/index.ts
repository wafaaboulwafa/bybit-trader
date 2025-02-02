import { OnStrategyType } from "../service/types";
import defaultStrategy from "./default";
import bbCrossStrategy from "./bbCross";
import wychoffStrategy from "./wychoff";
import trendFollowPullbackStrategy from "./trendFollowPullback";

export default new Map<string, OnStrategyType>([
  ["default", defaultStrategy],
  ["bbCross", bbCrossStrategy],
  ["wychoff", wychoffStrategy],
  ["trendFollowPullback", trendFollowPullbackStrategy],
]);
