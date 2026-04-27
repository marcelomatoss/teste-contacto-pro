import IORedis from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

let connection: IORedis | null = null;
let connectionAvailable = false;

export const getRedis = (): IORedis => {
  if (!connection) {
    connection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // BullMQ requires this
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 200, 3000),
    });
    connection.on("connect", () => {
      connectionAvailable = true;
      logger.info("Redis connected");
    });
    connection.on("error", (err) => {
      // BullMQ noises a lot on unavailable redis; log once at warn level
      if (connectionAvailable) {
        logger.warn({ err: err.message }, "Redis connection issue");
      }
      connectionAvailable = false;
    });
  }
  return connection;
};

export const isRedisAvailable = (): boolean => connectionAvailable;
