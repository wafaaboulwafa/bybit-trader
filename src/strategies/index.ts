import { OnStrategyType } from "../service/types";
import defaultStrategy from "./default";
import wychoffStrategy from "./wychoff";
import trendFollowPullbackStrategy from "./trendFollowPullback";

export default new Map<string, OnStrategyType>([
  ["default", defaultStrategy],
  ["wychoff", wychoffStrategy],
  ["trendFollowPullback", trendFollowPullbackStrategy],
]);
