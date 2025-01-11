import { restClient } from "../service/bybitClient";

class WalletRepo {
  #coins: Map<string, number> = new Map<string, number>();
  #margin: number = 0;
  #equity: number = 0;

  constructor() {}

  getCoinAmount(coin: string) {
    return this.#coins.get(coin) || 0;
  }

  get margin(): number {
    return this.#margin;
  }

  get equity(): number {
    return this.#equity;
  }

  setCoinAmount(coin: string, value: number) {
    this.#coins.set(coin, value);
  }

  async init(): Promise<void> {
    await restClient
      .getWalletBalance({
        accountType: "UNIFIED",
      })
      .then((r) => {
        if (r.retCode > 0) console.warn(r.retCode + " - " + r.retMsg);
        const coins = r.result.list.find(
          (n: any) => (n.accountType = "UNIFIED")
        );

        if (coins && coins.coin.length > 0) {
          this.#margin = parseFloat(coins.totalMarginBalance);
          this.#equity = parseFloat(coins.totalEquity);

          this.#coins.clear();
          for (const coinRec of coins.coin) {
            this.setCoinAmount(coinRec.coin, parseFloat(coinRec.equity));
          }
        }
      })
      .catch((e) => {
        console.warn(e);
      });
  }
}

export default WalletRepo;
