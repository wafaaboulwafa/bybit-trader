import MarketRepo from "./marketRepo";
import PositionsRepo from "./positionsRepo";
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

function getPositionsInstance() {
  const result = new PositionsRepo();
  (async () => {
    await result.refresh();
  })();
  return result;
}

//Initalize memory cache
const marketLiveInstance: MarketRepo = getMarketInstance();
const walletLiveInstance: WalletRepo = getWalletInstance();
const positionsLiveInstance: PositionsRepo = getPositionsInstance();

export { marketLiveInstance, walletLiveInstance, positionsLiveInstance };
