import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { marketLiveInstance as marketInfo } from "../repository/index";

export default function startHttpServer() {
  const app = express();
  const port = process.env.HTTP_PORT || 3000;

  app.use(bodyParser.json());

  app.get("/", (req: Request, res: Response) => {
    res.status(200).send("ByBit trader is running");
  });

  app.post("/", async (req: Request, res: Response) => {
    const pairData = marketInfo.getPair(req?.body?.pair);
    if (!pairData) {
      res.status(400);
      return;
    }
    const percentage = parseFloat(req?.body?.percentage || 0);

    if (percentage <= 0 || percentage > 1) {
      res.status(400);
      return;
    }

    const price = parseFloat(req?.body?.price || 0);

    if (price === 0) {
      res.status(400);
      return;
    }

    const side = req?.body?.side?.toLowerCase() || null;

    if (side !== "buy" && side !== "sell") {
      res.status(400);
      return;
    }

    //TODO should only close on reverse
    await pairData.closeOpenFuturePositions(price);

    if (side === "buy") {
      await pairData.postBuyOrder(price, percentage);
    } else if (side === "sell") {
      await pairData.postSellOrder(price, percentage);
    }

    res.status(200);
  });

  const server = app.listen(port, () => {
    console.log(
      `Bot notification endpoint is running on http://localhost:${port}`
    );
  });

  process.once("SIGINT", () => server.close());
  process.once("SIGTERM", () => server.close());
}
