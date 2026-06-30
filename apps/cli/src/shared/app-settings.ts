import * as dotenv from "dotenv";
dotenv.config({ path: `${process.cwd()}/.env` });

const isProd = process.env.NODE_ENV === "production";
const isDev = process.env.NODE_ENV !== "production";

const {
  NODE_ENV = "development",
  HOST = "0.0.0.0",
  PORT = "3090",
  JWT_SECRET = "your-super-secret-jwt-key-change-this-in-production",
  JWT_EXPIRES_IN = "15m",
  JWT_ISSUER = "goblins-api",
  JWT_AUDIENCE = "goblins-clients",
  ALLOWED_ORIGINS = "http://localhost:3000",
  DATABASE_URL = "",
  EMBEDDED_DATABASE_DIR = ".goblins/pglite",
  TRUST_PROXY,
  REQUEST_BODY_LIMIT = "1mb",
  HSTS_MAX_AGE = "63072000",
  HSTS_PRELOAD = "true",
  HSTS_INCLUDE_SUBDOMAINS = "true",
  CORS_MAX_AGE = "86400",
} = process.env;

if (isProd) {
  const requiredEnvVars = [
    "JWT_SECRET",
    "DATABASE_URL",
    "ALLOWED_ORIGINS",
  ];
  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName],
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`,
    );
  }

  if (JWT_SECRET === "your-super-secret-jwt-key-change-this-in-production") {
    throw new Error("JWT_SECRET must be changed in production!");
  }

  if (JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production");
  }
}

function parseTrustProxy(value: string | undefined): boolean | number | string {
  if (value === undefined) return isProd ? 1 : false;
  if (value === "true") return true;
  if (value === "false") return false;
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber) && asNumber >= 0) return asNumber;
  return value;
}

function parseOrigins(value: string): string[] {
  return value
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export const APP_SETTINGS = {
  NODE_ENV,
  HOST,
  PORT: parseInt(String(PORT), 10),
  IS_DEVELOPMENT: isDev,
  IS_PRODUCTION: isProd,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_ISSUER,
  JWT_AUDIENCE,
  ALLOWED_ORIGIN_LIST: parseOrigins(ALLOWED_ORIGINS),
  DATABASE_URL,
  USE_EMBEDDED_DATABASE: DATABASE_URL.trim().length === 0,
  EMBEDDED_DATABASE_DIR,
  TRUST_PROXY: parseTrustProxy(TRUST_PROXY),
  REQUEST_BODY_LIMIT,
  HSTS: {
    MAX_AGE: parseInt(HSTS_MAX_AGE, 10),
    PRELOAD: HSTS_PRELOAD === "true",
    INCLUDE_SUBDOMAINS: HSTS_INCLUDE_SUBDOMAINS === "true",
  },
  CORS_MAX_AGE: parseInt(CORS_MAX_AGE, 10),
};
