import MarketRepo from "./marketRepo";
import WalletRepo from "./walletRepo";

const marketLiveInstance = new MarketRepo();
marketLiveInstance.init(true);

const walletLiveInstance = new WalletRepo();
walletLiveInstance.init();

export { marketLiveInstance, walletLiveInstance };
