import { OnStrategyType } from "../service/types";
import defaultStrategy from "./default";
import wychoffStrategy from "./wychoff";
import trendFollowPullbackStrategy from "./trendFollowPullback";
import fiveMinInvertedStrategy from "./fiveMinInverted";

export default new Map<string, OnStrategyType>([
  ["default", defaultStrategy],
  ["wychoff", wychoffStrategy],
  ["trendFollowPullback", trendFollowPullbackStrategy],
  ["fiveMinInverted", fiveMinInvertedStrategy],
]);
