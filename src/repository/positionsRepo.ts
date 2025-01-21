import { PositionInfoParamsV5, PositionV5 } from "bybit-api";
import { restClient } from "../service/bybitClient";

class PositionsRepo {
  #positions: PositionV5[] = [];

  constructor() {}

  async refresh(): Promise<void> {
    const request: PositionInfoParamsV5 = {
      category: "linear",
    };
    await restClient
      .getPositionInfo(request)
      .then((r) => {
        if (r.retCode > 0) console.warn(r.retCode + " - " + r.retMsg);
        this.#positions = r.result.list;
      })
      .catch((e) => {
        console.warn(e);
      });
  }

  hasOpenSellPosition(symbol: string): boolean {
    return this.#positions.some(
      (p) => p.symbol === symbol && p.side === "Sell"
    );
  }

  hasOpenBuyPosition(symbol: string): boolean {
    return this.#positions.some((p) => p.symbol === symbol && p.side === "Buy");
  }

  clear(): void {
    this.#positions = [];
  }

  getPositions(symbol: string): PositionV5[] {
    return this.#positions.filter((p) => p.symbol === symbol);
  }
}

export default PositionsRepo;
