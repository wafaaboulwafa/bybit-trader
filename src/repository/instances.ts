import MarketRepo from "./marketRepo";
import WalletRepo from "./walletRepo";

function getMarketInstance() {
  const result = new MarketRepo();
  (async () => {
    await result.init(true);
  })();
  return result;
}

function getWalletInstance() {
  const result = new WalletRepo();
  (async () => {
    await result.init();
  })();
  return result;
}

const marketLiveInstance: MarketRepo = getMarketInstance();
const walletLiveInstance: WalletRepo = getWalletInstance();

export { marketLiveInstance, walletLiveInstance };
