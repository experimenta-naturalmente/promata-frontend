import { appToast } from "@/components/toast/toast";
import { isAxiosError } from "axios";

function normalizeMessage(message: unknown): string | null {
  if (typeof message === "string" && message.trim().length > 0) {
    return message.trim();
  }

  if (Array.isArray(message)) {
    const parts = message
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);

    return parts.length > 0 ? parts.join("\n") : null;
  }

  return null;
}

function readMessageFromData(data: unknown): string | null {
  if (typeof data === "string") {
    return normalizeMessage(data);
  }

  if (data && typeof data === "object" && "message" in data) {
    return normalizeMessage((data as { message?: unknown }).message);
  }

  return null;
}

function readMessageFromErrorLike(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  if (isAxiosError(error)) {
    return readMessageFromData(error.response?.data);
  }

  if ("response" in error) {
    const data = (error as { response?: { data?: unknown } }).response?.data;

    return readMessageFromData(data);
  }

  return null;
}

/** Extrai a mensagem de erro do body da API (NestJS: `{ message, error, statusCode }`). */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Erro inesperado",
): string {
  return readMessageFromErrorLike(error) ?? fallback;
}

/** Extrai mensagem de sucesso do body quando a API envia `{ message }`. */
export function getApiSuccessMessage(data: unknown, fallback: string): string {
  return readMessageFromData(data) ?? fallback;
}

export function toastApiError(error: unknown, fallback?: string) {
  appToast.error(getApiErrorMessage(error, fallback));
}

export function toastApiSuccess(data: unknown, fallback: string) {
  appToast.success(getApiSuccessMessage(data, fallback));
}
