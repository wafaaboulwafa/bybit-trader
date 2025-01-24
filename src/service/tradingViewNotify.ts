import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { marketLiveInstance as marketInfo } from "../repository/instances";

/*
Trading view payload:
{
  pair: "BTCUSD",
  price: 123,
  side : "buy" | "sell",
  takeProfit : 123,
  stopLoss : 123
}
*/

export default function startHttpServer() {
  const port = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : 0;
  if (port === 0) return;

  const app = express();
  app.use(bodyParser.json());

  //Index status page
  app.get("/", (req: Request, res: Response) => {
    res.status(200).send("ByBit trader is running");
  });

  //Post page
  app.post("/", async (req: Request, res: Response) => {
    //Find pair config
    const pairData = marketInfo.getPair(req?.body?.pair);
    if (!pairData) {
      res.status(400);
      return;
    }

    //Parse Price
    const price = parseFloat(req?.body?.price || 0);
    if (price === 0) {
      res.status(400);
      return;
    }

    //Parse Side
    const side = req?.body?.side?.toLowerCase() || null;
    if (side !== "buy" && side !== "sell") {
      res.status(400);
      return;
    }

    //Parse takeProfit and stopLoss
    const takeProfit = parseFloat(req?.body?.takeProfit || 0);
    const stopLoss = parseFloat(req?.body?.stopLoss || 0);

    if (side === "buy") {
      //Close all sell positions
      await pairData.closeOpenFuturePositions(0, true, false);
      //Create buy order
      await pairData.postBuyOrder(
        price,
        takeProfit > 0 ? takeProfit : undefined,
        stopLoss > 0 ? stopLoss : undefined
      );
    } else if (side === "sell") {
      //Close all buy positions
      await pairData.closeOpenFuturePositions(0, false, true);
      //Create sell order
      await pairData.postSellOrder(
        price,
        takeProfit > 0 ? takeProfit : undefined,
        stopLoss > 0 ? stopLoss : undefined
      );
    }

    //Return success
    res.status(200);
  });

  const server = app.listen(port, () => {
    console.log(
      `Bot notification endpoint is running on http://127.0.0.1:${port}`
    );
  });

  process.once("SIGINT", () => server.close());
  process.once("SIGTERM", () => server.close());
}
