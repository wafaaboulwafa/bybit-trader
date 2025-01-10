import { PairConfigType } from "../service/types";
import PairRepo from "./pairRepo";

class MarketRepo {
  #pairs = new Map<string, PairRepo>();
  #queue = [];
  constructor() {}

  init(loadHistory: boolean) {
    this.#pairs.clear();
    const pairs: PairConfigType[] = require("../../constants/config.json");

    for (let pairInfo of pairs)
      if (!this.#pairs.has(pairInfo.pairName)) {
        const pairRepo = this.addPair(pairInfo);
        if (pairRepo && loadHistory) pairRepo.init();
      }
  }

  clear() {
    this.#pairs.clear();
  }

  addPair(pairInfo: PairConfigType): PairRepo | undefined {
    if (!this.#pairs.has(pairInfo.pairName)) {
      const pairRepo = new PairRepo(
        pairInfo.pairName,
        pairInfo.timeFrames,
        pairInfo.strategy,
        pairInfo.baseCoin,
        pairInfo.quotationCoin,
        pairInfo.isFuture
      );
      this.#pairs.set(pairInfo.pairName, pairRepo);
      return pairRepo;
    }
  }
  getPair(pairName: string): PairRepo | undefined {
    return this.#pairs.get(pairName);
  }

  get pairs(): PairRepo[] {
    return Array.from(this.#pairs.values());
  }
}

export default MarketRepo;
