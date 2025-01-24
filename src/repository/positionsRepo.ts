import { PositionInfoParamsV5, PositionV5 } from "bybit-api";
import { restClient } from "../service/bybitClient";
import { PositionType } from "../service/types";

class PositionsRepo {
  #positions: PositionType[] = [];

  constructor() {}

  async refresh(): Promise<void> {
    const request: PositionInfoParamsV5 = {
      category: "linear",
      settleCoin: "USDT",
    };
    await restClient
      .getPositionInfo(request)
      .then((r) => {
        if (r.retCode > 0) console.warn(r.retCode + " - " + r.retMsg);
        this.#positions = r.result.list
          .filter((r) => r.side === "Buy" || r.side === "Sell")
          .map((r) => {
            const res: PositionType = {
              id: r.seq,
              symbol: r.symbol,
              side: r.side === "Buy" ? "Buy" : "Sell",
              qty: (r.size && parseFloat(r.size)) || 0,
              takeProfit:
                (r.takeProfit && parseFloat(r.takeProfit)) || undefined,
              stopLoss: (r.stopLoss && parseFloat(r.stopLoss)) || undefined,
              pnl: parseFloat(r.unrealisedPnl),
              createdTime: new Date(parseInt(r.createdTime)),
              entryPrice: parseFloat(r.avgPrice),
            };
            return res;
          });
      })
      .catch((e) => {
        console.warn(e);
      });
  }

  hasOpenSellPosition(symbol: string): boolean {
    return this.#positions.some(
      (p) =>
        p.symbol.toLowerCase() === symbol.toLowerCase() && p.side === "Sell"
    );
  }

  hasOpenBuyPosition(symbol: string): boolean {
    return this.#positions.some(
      (p) => p.symbol.toLowerCase() === symbol.toLowerCase() && p.side === "Buy"
    );
  }

  clear(): void {
    this.#positions = [];
  }

  getPositions(symbol: string | undefined = undefined): PositionType[] {
    if (symbol)
      return this.#positions.filter(
        (p) => p.symbol.toLowerCase() === symbol.toLowerCase()
      );
    else return this.#positions;
  }
}

export default PositionsRepo;
