import {
  notifyWalletUpdate,
  notifyOrderUpdate,
  notifyExecutionUpdate,
} from "./telgramClient";
import {
  walletLiveInstance as wallet,
  positionsLiveInstance as positions,
} from "../repository/instances";
import { createSocketClient } from "./bybitClient";

export default async function startNotificationBot() {
  //ByBit Socket client
  const wsClient = createSocketClient("WALLET");
  //Close all socket connection when application shutdown
  process.once("SIGINT", () => wsClient.closeAll(true));
  process.once("SIGTERM", () => wsClient.closeAll(true));

  wsClient.on("update", (data: any) => {
    if (data.topic === "execution") {
      //Telegram notification for order executed
      if (data.data.length > 0) notifyExecutionUpdate(data.data[0]);
    } else if (data.topic === "order") {
      //Telegram notification for order created
      if (data.data.length > 0) notifyOrderUpdate(data.data[0]);
    } else if (data.topic === "wallet") {
      //Telegram notification for wallet update
      if (data.data.length > 0) {
        wallet.setCoinAmount(data.data[0].coin, data.data[0].totalEquity);
        notifyWalletUpdate(data.data[0]);
      }
    } else if (data.topic === "position") {
      //
    }
  });

  //Create socket subscriptions
  wsClient
    .subscribeV5(["order", "execution", "wallet"], "spot")
    .catch((e) => console.warn(e));
  wsClient
    .subscribeV5(["order", "execution", "wallet", "position"], "linear")
    .catch((e) => console.warn(e));
}
