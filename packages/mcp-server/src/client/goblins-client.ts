type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: RequestMethod;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
};

type ApiEnvelope<T> = {
  result: T;
  status: string;
  statusCode: number;
  msg: string;
};

export class GoblinsApiError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly responseBody?: unknown,
  ) {
    super(message);
    this.name = "GoblinsApiError";
  }
}

export class GoblinsClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl = process.env.GOBLINS_API_BASE_URL ?? "http://localhost:3090",
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (process.env.GOBLINS_API_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GOBLINS_API_TOKEN}`;
    }

    if (process.env.GOBLINS_API_KEY) {
      headers["x-api-key"] = process.env.GOBLINS_API_KEY;
    }

    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw new GoblinsApiError(
        buildErrorMessage(response, responseBody),
        response.status,
        responseBody,
      );
    }

    return unwrapEnvelope<T>(responseBody);
  }
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function unwrapEnvelope<T>(responseBody: unknown): T {
  if (
    responseBody &&
    typeof responseBody === "object" &&
    "result" in responseBody
  ) {
    return (responseBody as ApiEnvelope<T>).result;
  }

  return responseBody as T;
}

function buildErrorMessage(response: Response, responseBody: unknown): string {
  if (responseBody && typeof responseBody === "object") {
    const body = responseBody as { message?: string; msg?: string };
    const message = body.message ?? body.msg;
    if (message) {
      return `${response.status} ${response.statusText}: ${message}`;
    }
  }

  if (typeof responseBody === "string" && responseBody.trim()) {
    return `${response.status} ${response.statusText}: ${responseBody}`;
  }

  return `${response.status} ${response.statusText}`;
}
