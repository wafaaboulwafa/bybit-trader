import { restClient } from "../service/tradingApi";

class WalletRepo {
  #coins: Map<string, number> = new Map<string, number>();

  constructor() {
    this.init();
  }

  getCoinAmount(coin: string) {
    return this.#coins.get(coin);
  }

  setCoinAmount(coin: string, value: number) {
    this.#coins.set(coin, value);
  }

  async init(): Promise<void> {
    this.#coins.clear();
    const response = await restClient
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

        return 0;
      })
      .catch((e) => {
        console.warn(e);
      });
  }
}

const walletInstance = new WalletRepo();

export default walletInstance;
