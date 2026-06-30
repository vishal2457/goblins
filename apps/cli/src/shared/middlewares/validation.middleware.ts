import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { validateRequest } from "../utils/zod-validate.util";

export const validate = (schemas: {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = validateRequest(req, schemas);
      req.body = parsed.body;
      req.params = parsed.params;
      req.query = parsed.query;
      next();
    } catch (error) {
      next(error);
    }
  }
}
