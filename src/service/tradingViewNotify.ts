import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { marketLiveInstance as marketInfo } from "../repository/instances";
import { NotifyRequestType } from "./types";
import { ParamsDictionary } from "express-serve-static-core";

export default function startHttpServer() {
  const port = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : 0;
  if (port === 0) return;

  const app = express();
  app.use(bodyParser.json());

  //Index status page
  app.get("/", (req: Request, res: Response<string>) => {
    res.status(200).send("Trading bot is running");
  });

  //Post page
  app.post(
    "/",
    async (
      req: Request<ParamsDictionary, any, NotifyRequestType>,
      res: Response
    ) => {
      //Find pair config
      const reqBody = req.body;

      const pairData = marketInfo.getPair(reqBody.pair);
      if (!pairData) {
        res.status(400);
        return;
      }

      if (
        reqBody.price <= 0 &&
        (reqBody.action === "buy" || reqBody.action === "sell")
      ) {
        res.status(400);
        return;
      }

      const closeSell =
        reqBody.action === "buy" ||
        reqBody.action === "closeSell" ||
        reqBody.action === "closeAll";

      const closeBuy =
        reqBody.action === "sell" ||
        reqBody.action === "closeBuy" ||
        reqBody.action === "closeAll";

      if (closeSell || closeBuy)
        await pairData.closeOpenFuturePositions(0, closeSell, closeBuy);

      if (reqBody.action === "buy") {
        //Create buy order
        await pairData.postBuyOrder(
          reqBody.price,
          reqBody.takeProfit,
          reqBody.stopLoss
        );
      } else if (reqBody.action === "sell") {
        //Create sell order
        await pairData.postSellOrder(
          reqBody.price,
          reqBody.takeProfit,
          reqBody.stopLoss
        );
      }

      res.status(200);
    }
  );

  const server = app.listen(port, () => {
    console.log(
      `Bot notification endpoint is running on http://127.0.0.1:${port}`
    );
  });

  process.once("SIGINT", () => server.close());
  process.once("SIGTERM", () => server.close());
}
