import type { Request, Response, NextFunction } from "express";
import { httpDuration } from "./metrics.js";

/**
 * Express middleware that records every request's latency by
 * (method, route template, status). Uses route.path so cardinality stays
 * bounded — `/api/conversations/:id` is one bucket, not one-per-id.
 */
export const httpMetricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const end = httpDuration.startTimer();
  res.on("finish", () => {
    const route = req.route?.path
      ? `${req.baseUrl || ""}${req.route.path}`
      : req.originalUrl.split("?")[0];
    end({
      method: req.method,
      route,
      status: String(res.statusCode),
    });
  });
  next();
};
