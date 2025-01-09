import { PairConfigType } from "../service/types";
import PairRepo from "./pairRepo";

class MarketRepo {
  #pairs = new Map<string, PairRepo>();

  constructor() {
    this.init();
  }

  init() {
    this.#pairs.clear();
    const pairs: PairConfigType[] = require("../../constants/config.json");

    for (let pairInfo of pairs)
      if (!this.#pairs.has(pairInfo.pairName)) {
        this.#pairs.set(
          pairInfo.pairName,
          new PairRepo(
            pairInfo.pairName,
            pairInfo.timeFrames,
            pairInfo.strategy,
            pairInfo.baseCoin,
            pairInfo.quotationCoin,
            pairInfo.isFuture
          )
        );
      }
  }

  getPair(pairName: string): PairRepo | undefined {
    return this.#pairs.get(pairName);
  }
}

const marketInstance = new MarketRepo();

export default marketInstance;
