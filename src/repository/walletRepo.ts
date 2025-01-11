import { restClient } from "../service/bybitClient";

class WalletRepo {
  #coins: Map<string, number> = new Map<string, number>();

  constructor() {}

  getCoinAmount(coin: string) {
    return this.#coins.get(coin) || 0;
  }

  setCoinAmount(coin: string, value: number) {
    this.#coins.set(coin, value);
  }

  async init(): Promise<void> {
    this.#coins.clear();
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
