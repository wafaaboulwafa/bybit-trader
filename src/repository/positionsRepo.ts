import { GetAccountOrdersParamsV5, PositionInfoParamsV5 } from "bybit-api";
import { restClient } from "../service/bybitClient";
import { PositionType } from "../service/types";

//Open positions cache
class PositionsRepo {
  #positions: PositionType[] = [];

  constructor() {}

  async refresh(): Promise<void> {
    this.#positions = [];

    const positionsRequest: PositionInfoParamsV5 = {
      category: "linear",
      settleCoin: "USDT",
    };
    await restClient
      .getPositionInfo(positionsRequest)
      .then((r) => {
        if (r.retCode > 0) console.warn(r.retCode + " - " + r.retMsg);

        const openPositions = r.result.list
          .filter((r) => r.side === "Buy" || r.side === "Sell")
          .map((r) => {
            const res: PositionType = {
              id: r.seq.toString(),
              symbol: r.symbol,
              side: r.side === "Buy" ? "Buy" : "Sell",
              qty: (r.size && parseFloat(r.size)) || 0,
              takeProfit:
                (r.takeProfit && parseFloat(r.takeProfit)) || undefined,
              stopLoss: (r.stopLoss && parseFloat(r.stopLoss)) || undefined,
              pnl: parseFloat(r.unrealisedPnl),
              createdTime: new Date(parseInt(r.createdTime)),
              entryPrice: parseFloat(r.avgPrice),
              pending: false,
            };
            return res;
          });

        this.#positions.push(...openPositions);
      })
      .catch((e) => {
        console.warn(e);
      });

    const ordersRequest: GetAccountOrdersParamsV5 = {
      category: "linear",
      settleCoin: "USDT",
      openOnly: 0, //New and partial filled
    };

    await restClient
      .getActiveOrders(ordersRequest)
      .then((r) => {
        if (r.retCode > 0) console.warn(r.retCode + " - " + r.retMsg);

        const pendingOrders = r.result.list
          .filter((r) => r.side === "Buy" || r.side === "Sell")
          .map((r) => {
            const res: PositionType = {
              id: r.orderId,
              symbol: r.symbol,
              side: r.side === "Buy" ? "Buy" : "Sell",
              qty: (r.qty && parseFloat(r.qty)) || 0,
              takeProfit:
                (r.takeProfit && parseFloat(r.takeProfit)) || undefined,
              stopLoss: (r.stopLoss && parseFloat(r.stopLoss)) || undefined,
              pnl: 0,
              createdTime: new Date(parseInt(r.createdTime)),
              entryPrice: parseFloat(r.price),
              pending: true,
            };
            return res;
          });

        this.#positions.push(...pendingOrders);
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
