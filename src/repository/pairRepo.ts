import { CandleType } from "../service/types";
import TimeFrameRepo from "./timeFrameRepo";

class PairRepo {
  #pair: string = "";
  #timeFrames: Map<string, TimeFrameRepo> = new Map<string, TimeFrameRepo>();
  #strategy: string = "";
  #baseCoin: string = "";
  #quotationCoin: string = "";

  constructor(
    pair: string,
    timeFrames: string[] = [],
    strategy: string,
    baseCoin: string,
    quotationCoin: string
  ) {
    this.#pair = pair;
    this.#strategy = strategy;
    this.#baseCoin = baseCoin;
    this.#quotationCoin = quotationCoin;

    for (let timeframe of timeFrames)
      this.#timeFrames.set(timeframe, new TimeFrameRepo());
  }

  get pair() {
    return this.#pair;
  }

  get strategy() {
    return this.#strategy;
  }

  get baseCoin() {
    return this.#baseCoin;
  }

  get quotationCoin() {
    return this.#quotationCoin;
  }

  getTimeFrame(timeFrame: string) {
    return this.#timeFrames.get(timeFrame);
  }

  addCandle(timeFrame: string, candle: CandleType) {
    if (this.#timeFrames.has(timeFrame))
      this.#timeFrames.get(timeFrame)?.addCandle(candle);
  }

  cleanup() {
    this.#timeFrames.forEach((value, key) => value.cleanup());
  }
}

export default PairRepo;
