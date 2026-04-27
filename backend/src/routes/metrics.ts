import { Router } from "express";
import { registry } from "../observability/metrics.js";

export const metricsRouter = Router();

metricsRouter.get("/", async (_req, res) => {
  res.set("Content-Type", registry.contentType);
  res.end(await registry.metrics());
});
