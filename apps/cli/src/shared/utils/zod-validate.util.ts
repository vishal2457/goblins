import { ZodError, ZodSchema } from "zod";
import { BadRequestError } from "./http-errors.util";
import { type Request } from "express";

export const validateRequest = (
  req: Request,
  schemas: {
    body?: ZodSchema;
    params?: ZodSchema;
    query?: ZodSchema;
  },
): { body: Request["body"]; params: Request["params"]; query: Request["query"] } => {
  const { body, params, query } = schemas;
  const errors: { body?: any; params?: any; query?: any } = {};

  let parsedBody = req.body;
  let parsedParams = req.params;
  let parsedQuery = req.query;

  try {
    if (body) {
      parsedBody = body.parse(req.body);
    }
  } catch (error) {
    if (error instanceof ZodError) {
      errors.body = error.format();
    }
  }

  try {
    if (params) {
      parsedParams = params.parse(req.params);
    }
  } catch (error) {
    if (error instanceof ZodError) {
      errors.params = error.format();
    }
  }

  try {
    if (query) {
      parsedQuery = query.parse(req.query);
    }
  } catch (error) {
    if (error instanceof ZodError) {
      errors.query = error.format();
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new BadRequestError("Validation failed", errors);
  }

  return { body: parsedBody, params: parsedParams, query: parsedQuery };
};
