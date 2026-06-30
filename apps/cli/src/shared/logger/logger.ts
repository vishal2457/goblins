import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import { APP_SETTINGS } from "../app-settings";

const LOG_DIR = path.join(process.cwd(), "logs");
const isProd = APP_SETTINGS.IS_PRODUCTION;

const baseFormat = winston.format.combine(
  winston.format.timestamp({ alias: "timestamp" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
);

const consoleFormat = winston.format.combine(
  baseFormat,
  isProd
    ? winston.format.json()
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp: ts, level, message, ...meta }) => {
          const rest = Object.keys(meta).length
            ? ` ${JSON.stringify(meta)}`
            : "";
          return `${ts} ${level}: ${message}${rest}`;
        }),
      ),
);

const fileFormat = winston.format.combine(baseFormat, winston.format.json());

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
    handleExceptions: true,
  }),
];

if (isProd) {
  transports.push(
    new DailyRotateFile({
      filename: path.join(LOG_DIR, "app-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      format: fileFormat,
      handleExceptions: true,
    }),
    new DailyRotateFile({
      level: "error",
      filename: path.join(LOG_DIR, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "30d",
      format: fileFormat,
      handleExceptions: true,
    }),
  );
}

const logger = winston.createLogger({
  level: isProd ? "info" : "debug",
  defaultMeta: { service: "api", env: APP_SETTINGS.NODE_ENV },
  transports,
  exitOnError: false,
});

export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;
