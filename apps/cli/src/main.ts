import * as dotenv from "dotenv";
dotenv.config({ path: `${process.cwd()}/.env` });
import http from "http";
import app from "./express-app";
import { APP_SETTINGS } from "./shared/app-settings";
import { ensureStore } from "./shared/file-store";
import cluster from "cluster";
import os from "os";
import { logger } from "./shared/logger";

const SHUTDOWN_TIMEOUT_MS = 10_000;

function gracefulShutdown(
  server: http.Server,
) {
  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals | "uncaughtException" | "unhandledRejection") => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("shutdown_started", { signal });

    const forceExit = setTimeout(() => {
      logger.error("shutdown_timeout_force_exit");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    try {
      await new Promise<void>((resolve) => {
        server.close((err) => {
          if (err) logger.error("http_server_close_error", { error: err.message });
          resolve();
        });
      });
      logger.info("http_server_closed");

      logger.info("graceful_shutdown_complete");
      process.exit(0);
    } catch (err) {
      logger.error("shutdown_error", { error: (err as Error).message });
      process.exit(1);
    }
  };

  (["SIGTERM", "SIGINT", "SIGUSR2"] as NodeJS.Signals[]).forEach((signal) => {
    process.on(signal, () => {
      void shutdown(signal);
    });
  });

  process.on("uncaughtException", (err) => {
    logger.error("uncaught_exception", { error: err.message, stack: err.stack });
    void shutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("unhandled_rejection", {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
    void shutdown("unhandledRejection");
  });
}

async function startServer() {
  try {
    await ensureStore();

    const server = http.createServer(app);
    gracefulShutdown(server);

    server.listen(APP_SETTINGS.PORT, APP_SETTINGS.HOST, () => {
      logger.info("server_listening", {
        host: APP_SETTINGS.HOST,
        port: APP_SETTINGS.PORT,
        env: APP_SETTINGS.NODE_ENV,
        pid: process.pid,
      });
    });
  } catch (err) {
    logger.error("server_start_failed", { error: (err as Error).message });
    process.exit(1);
  }
}

if (APP_SETTINGS.IS_PRODUCTION && cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  logger.info("cluster_master_start", { pid: process.pid, workers: numCPUs });

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    logger.warn("cluster_worker_exit", {
      pid: worker.process.pid,
      code,
      signal,
    });
    if (!worker.exitedAfterDisconnect) {
      cluster.fork();
    }
  });
} else {
  void startServer();
}
