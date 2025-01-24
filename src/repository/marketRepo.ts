import { getPairsConfig } from "../service/misc";
import { PairConfigType } from "../service/types";
import PairRepo from "./pairRepo";

class MarketRepo {
  #pairs = new Map<string, PairRepo>();

  constructor() {}

  async init(loadHistory: boolean) {
    this.#pairs.clear();
    const pairs: PairConfigType[] = getPairsConfig();

    for (let pairInfo of pairs)
      if (!this.#pairs.has(pairInfo.pairName)) {
        const pairRepo = this.addPair(pairInfo);
        if (pairRepo && loadHistory) await pairRepo.init();
      }
  }

  clear() {
    this.#pairs.clear();
  }

  addPair(pairInfo: PairConfigType): PairRepo | undefined {
    if (!this.#pairs.has(pairInfo.pairName)) {
      const p = new PairRepo(
        pairInfo.pairName,
        pairInfo.timeFrames as string[],
        pairInfo.strategy,
        pairInfo.baseCoin,
        pairInfo.quotationCoin,
        pairInfo.isFuture,
        pairInfo.invert,
        pairInfo.riskAmount,
        pairInfo.riskMethod
      );
      this.#pairs.set(pairInfo.pairName, p);
      return p;
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
