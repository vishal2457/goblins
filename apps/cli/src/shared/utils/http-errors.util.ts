export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
    public isOperational = true,
    public stack = "",
  ) {
    super(message);
    this.name = this.constructor.name;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string = "Bad Request", details?: unknown) {
    super(400, message, details);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string = "Conflict", details?: unknown) {
    super(409, message, details);
  }
}

export class UnprocessableEntityError extends HttpError {
  constructor(message: string = "Unprocessable Entity", details?: unknown) {
    super(422, message, details);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = "Resource Not Found", details?: unknown) {
    super(404, message, details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string = "Unauthorized", details?: unknown) {
    super(401, message, details);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string = "Forbidden", details?: unknown) {
    super(403, message, details);
  }
}

export class ServerError extends HttpError {
  constructor(message: string = "Internal Server Error", details?: unknown) {
    super(500, message, details);
  }
}
