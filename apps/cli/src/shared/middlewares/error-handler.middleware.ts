import type { NextFunction, Response, Request } from "express";
import multer from "multer";
import * as jwt from "jsonwebtoken";
import { HttpError } from "../utils/http-errors.util";
import { APP_SETTINGS } from "../app-settings";
import { logger } from "../logger";

interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
  statusCode: number;
  stack?: string;
  details?: unknown;
}

function reasonFromJwtError(err: unknown): string {
  if (err instanceof jwt.TokenExpiredError) return "token_expired";
  if (err instanceof jwt.NotBeforeError) return "token_not_active";
  if (err instanceof jwt.JsonWebTokenError) return "invalid_token";
  return "unauthorized";
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = 500;
  let errorMessage = "Internal Server Error";
  let errorCode: string | undefined;
  let isOperational = false;
  let errorDetails: unknown;
  let jwtReason: string | undefined;

  if (err instanceof HttpError) {
    statusCode = err.statusCode;
    errorMessage = err.message;
    isOperational = err.isOperational;
    if (APP_SETTINGS.IS_DEVELOPMENT) {
      errorDetails = err.details;
    }
  } else if (err instanceof multer.MulterError) {
    statusCode = 400;
    isOperational = true;
    if (err.code === "LIMIT_FILE_SIZE") {
      errorMessage = "File must be 25 MB or smaller";
    } else if (err.code === "LIMIT_FILE_COUNT") {
      errorMessage = "Only one file can be uploaded per request";
    } else {
      errorMessage = err.message || "Invalid file upload";
    }
  } else if (
    err instanceof jwt.JsonWebTokenError ||
    err instanceof jwt.TokenExpiredError ||
    err instanceof jwt.NotBeforeError
  ) {
    jwtReason = reasonFromJwtError(err);
    statusCode = 401;
    isOperational = true;
    errorCode = jwtReason;
    errorMessage =
      jwtReason === "token_expired"
        ? "Token has expired"
        : jwtReason === "token_not_active"
          ? "Token is not yet active"
          : "Invalid token";
  } else if (err instanceof SyntaxError && "body" in err) {
    statusCode = 400;
    isOperational = true;
    errorCode = "invalid_json";
    errorMessage = "Invalid JSON body";
  }

  const errorResponse: ErrorResponse = {
    success: false,
    message: errorMessage,
    statusCode,
  };

  if (errorCode) errorResponse.code = errorCode;
  if (errorDetails !== undefined) errorResponse.details = errorDetails;
  if (APP_SETTINGS.IS_DEVELOPMENT) errorResponse.stack = err.stack;

  const logPayload: Record<string, unknown> = {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.id,
    statusCode,
    isOperational,
    message: errorMessage,
    code: errorCode ?? jwtReason,
    stack: err.stack,
  };

  if (statusCode >= 500) {
    logger.error("request_error", logPayload);
  } else if (statusCode >= 400) {
    logger.warn("request_error", logPayload);
  } else {
    logger.info("request_error", logPayload);
  }

  res.status(statusCode).json(errorResponse);
};
