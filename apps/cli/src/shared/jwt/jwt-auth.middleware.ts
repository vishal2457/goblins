import * as jwt from "jsonwebtoken";
import { APP_SETTINGS } from "../app-settings";
import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../utils/http-errors.util";

export interface JwtPayload {
  id: string;
  email: string;
  roleIds?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const JWT_VERIFY_OPTIONS: jwt.VerifyOptions = {
  algorithms: ["HS256"],
  issuer: APP_SETTINGS.JWT_ISSUER,
  audience: APP_SETTINGS.JWT_AUDIENCE,
  clockTolerance: 5,
};

export const JWT_SIGN_OPTIONS: jwt.SignOptions = {
  algorithm: "HS256",
  expiresIn: APP_SETTINGS.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  issuer: APP_SETTINGS.JWT_ISSUER,
  audience: APP_SETTINGS.JWT_AUDIENCE,
};

function reasonFromJwtError(err: unknown): string {
  if (err instanceof jwt.TokenExpiredError) return "token_expired";
  if (err instanceof jwt.NotBeforeError) return "token_not_active";
  if (err instanceof jwt.JsonWebTokenError) return "invalid_token";
  return "unauthorized";
}

export const secure = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("missing_token");
    }
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      throw new UnauthorizedError("missing_token");
    }

    const decoded = jwt.verify(token, APP_SETTINGS.JWT_SECRET, JWT_VERIFY_OPTIONS);
    req.user = decoded as JwtPayload;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return next(error);
    }
    return next(new UnauthorizedError(reasonFromJwtError(error)));
  }
};
