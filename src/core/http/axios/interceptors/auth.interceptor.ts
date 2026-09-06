import type { AxiosError, InternalAxiosRequestConfig } from "axios";

import { AUTH_TOKEN_STORAGE_KEY } from "@/utils/consts/auth-consts";

export function authInterceptor(
  config: InternalAxiosRequestConfig
): InternalAxiosRequestConfig {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

  if (token) {
    config.headers.Authorization = "Bearer ".concat(token);
  }

  return config;
}

/**
 * Um 401 é a única resposta que prova que o token guardado não vale mais, então é
 * o único momento seguro para descartá-lo. Erros de rede, 429 e 5xx são deixados
 * de lado de propósito: descartar o token nesses casos deslogaria o usuário por
 * uma falha temporária.
 */
export function unauthorizedInterceptor(error: AxiosError): Promise<never> {
  if (error.response?.status === 401) {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }

  return Promise.reject(error);
}
