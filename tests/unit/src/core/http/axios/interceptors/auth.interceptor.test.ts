import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  authInterceptor,
  unauthorizedInterceptor,
} from "@/core/http/axios/interceptors/auth.interceptor";

describe("authInterceptor", () => {
  beforeEach(() => {
    localStorage.removeItem("token");
  });

  afterEach(() => {
    localStorage.removeItem("token");
  });

  it("does not set Authorization header when no token is present", () => {
    const cfg = { headers: {} } as InternalAxiosRequestConfig;

    const result = authInterceptor(cfg);

    expect(result).toBe(cfg);
    expect(result.headers.Authorization).toBeUndefined();
  });

  it("sets Authorization header when token is present in localStorage", () => {
    localStorage.setItem("token", "my-secret-token");

    const cfg = { headers: {} } as InternalAxiosRequestConfig;

    const result = authInterceptor(cfg);

    expect(result.headers.Authorization).toBe("Bearer my-secret-token");
  });
});

describe("unauthorizedInterceptor", () => {
  const createError = (status?: number) =>
    ({ response: status ? { status } : undefined }) as AxiosError;

  beforeEach(() => {
    localStorage.setItem("token", "my-secret-token");
  });

  afterEach(() => {
    localStorage.removeItem("token");
  });

  it("discards the stored token on 401", async () => {
    const error = createError(401);

    await expect(unauthorizedInterceptor(error)).rejects.toBe(error);
    expect(localStorage.getItem("token")).toBeNull();
  });

  it.each([undefined, 429, 500])(
    "keeps the token when the failure is %s",
    async (status) => {
      const error = createError(status);

      await expect(unauthorizedInterceptor(error)).rejects.toBe(error);
      expect(localStorage.getItem("token")).toBe("my-secret-token");
    },
  );
});
