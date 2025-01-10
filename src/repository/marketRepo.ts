import { PairConfigType } from "../service/types";
import PairRepo from "./pairRepo";

class MarketRepo {
  #pairs = new Map<string, PairRepo>();

  constructor() {}

  init() {
    this.#pairs.clear();
    const pairs: PairConfigType[] = require("../../constants/config.json");

    for (let pairInfo of pairs)
      if (!this.#pairs.has(pairInfo.pairName)) {
        const pairRepo = new PairRepo(
          pairInfo.pairName,
          pairInfo.timeFrames,
          pairInfo.strategy,
          pairInfo.baseCoin,
          pairInfo.quotationCoin,
          pairInfo.isFuture
        );
        pairRepo.init();
        this.#pairs.set(pairInfo.pairName, pairRepo);
      }
  }

  getPair(pairName: string): PairRepo | undefined {
    return this.#pairs.get(pairName);
  }
}

export default MarketRepo;
