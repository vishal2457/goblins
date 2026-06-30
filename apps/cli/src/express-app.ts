import compression from "compression";
import cors from "cors";
import express, { Express, Response } from "express";
import { existsSync } from "fs";
import helmet from "helmet";
import path from "path";
import morgan from "morgan";
import routerv1 from "./routes/v1/router";
import { errorHandler } from "./shared/middlewares/error-handler.middleware";
import { APP_SETTINGS } from "./shared/app-settings";
import { swaggerSpec } from "./shared/swagger";
import swaggerUi from "swagger-ui-express";
import { secure } from "./shared/jwt/jwt-auth.middleware";
import { requestId, requestLogger } from "./shared/middlewares/request-id.middleware";
import { sanitizeInputs } from "./shared/middlewares/sanitize.middleware";
import { createHealthRouter } from "./shared/health/health.router";
import { loggerStream } from "./shared/logger";

const app: Express = express();
const WEB_DIST_CANDIDATES = [
  process.env.GOBLINS_WEB_DIST,
  path.resolve(__dirname, "public"),
  path.resolve(process.cwd(), "apps/web/dist"),
].filter(Boolean) as string[];

app.disable("x-powered-by");
app.set("trust proxy", APP_SETTINGS.TRUST_PROXY);

app.use(requestId);

app.use(
  helmet({
    contentSecurityPolicy: APP_SETTINGS.IS_PRODUCTION
      ? {
          directives: {
            defaultSrc: ["'self'"],
            baseUri: ["'self'"],
            frameAncestors: ["'none'"],
            formAction: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            objectSrc: ["'none'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'", "https:", "wss:"],
            fontSrc: ["'self'", "https:", "data:"],
            upgradeInsecureRequests: [],
          },
        }
      : false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "no-referrer" },
    frameguard: { action: "deny" },
    hsts: {
      maxAge: APP_SETTINGS.HSTS.MAX_AGE,
      includeSubDomains: APP_SETTINGS.HSTS.INCLUDE_SUBDOMAINS,
      preload: APP_SETTINGS.HSTS.PRELOAD,
    },
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    hidePoweredBy: true,
    noSniff: true,
    xssFilter: true,
  }),
);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    if (!APP_SETTINGS.IS_PRODUCTION) {
      return callback(null, true);
    }
    if (APP_SETTINGS.ALLOWED_ORIGIN_LIST.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: APP_SETTINGS.CORS_MAX_AGE,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Cache-Control",
    "Connection",
    "Accept",
    "Accept-Encoding",
    "X-Requested-With",
    "X-Org-Id",
    "X-Request-Id",
  ],
  exposedHeaders: [
    "Cache-Control",
    "Connection",
    "Content-Type",
    "Date",
    "Etag",
    "Expires",
    "Keep-Alive",
    "Last-Modified",
    "Request-Id",
    "Server",
    "Transfer-Encoding",
  ],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(
  compression({
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      if (
        req.path.includes("/stream") ||
        req.path.includes("/events") ||
        req.path.includes("/ai-sdk")
      ) {
        return false;
      }
      const contentType = res.get("content-type");
      if (
        contentType &&
        (contentType.includes("text/event-stream") ||
          contentType.includes("text/plain"))
      ) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6,
    threshold: 1024,
  }),
);

app.use(
  express.json({
    limit: APP_SETTINGS.REQUEST_BODY_LIMIT,
    strict: true,
  }),
);
app.use(
  express.urlencoded({
    extended: true,
    limit: APP_SETTINGS.REQUEST_BODY_LIMIT,
  }),
);

app.use(sanitizeInputs);

app.use(requestLogger);

if (APP_SETTINGS.IS_PRODUCTION) {
  app.use(morgan("combined", { stream: loggerStream }));
} else {
  app.use(morgan("dev", { stream: loggerStream }));
}

app.use(
  "/static",
  express.static(path.join(process.cwd(), "mx-images"), {
    maxAge: APP_SETTINGS.IS_PRODUCTION ? "1d" : 0,
    etag: true,
    lastModified: true,
    index: false,
    dotfiles: "deny",
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  }),
);

app.use(createHealthRouter());

if (APP_SETTINGS.IS_DEVELOPMENT) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

app.use("/api/v1", APP_SETTINGS.IS_PRODUCTION ? secure : (_req, _res, next) => next(), routerv1);

const webDist = WEB_DIST_CANDIDATES.find((candidate) => {
  return existsSync(path.join(candidate, "index.html"));
});

app.use("/api", (_req, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    statusCode: 404,
  });
});

if (webDist) {
  app.use(
    express.static(webDist, {
      maxAge: APP_SETTINGS.IS_PRODUCTION ? "1d" : 0,
      etag: true,
      lastModified: true,
      index: false,
    }),
  );

  app.get("*", (_req, res: Response) => {
    res.sendFile(path.join(webDist, "index.html"));
  });
}

app.use("*", (_req, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    statusCode: 404,
  });
});

app.use(errorHandler);

export default app;
