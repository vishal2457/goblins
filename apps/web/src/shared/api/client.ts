import axios from "axios";

type ApiErrorShape = {
  message?: string;
  msg?: string;
  error?: string;
};

function extractErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;

  const payload = data as ApiErrorShape;
  return payload.message || payload.msg || payload.error || null;
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_AGENT_SERVER_URL || "",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const statusText = error.response?.statusText;
    const message =
      extractErrorMessage(error.response?.data) || error.message || "Request failed";

    return Promise.reject(
      new Error(
        status
          ? `${status}${statusText ? ` ${statusText}` : ""}: ${message}`
          : message,
      ),
    );
  },
);
