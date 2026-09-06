import { beforeEach, describe, expect, test, vi } from "vitest";
import { useLogin } from "@/hooks/auth/useLogin";

const navigateMock = vi.fn();
const searchMock = vi.fn(() => ({}) as Record<string, unknown>);

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
  useSearch: () => searchMock(),
}));

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/components/toast/toast", () => ({
  appToast: toastMocks,
}));

const translationMocks = vi.hoisted(() => ({
  t: vi.fn((key: string) => key),
}));

vi.mock("i18next", () => ({
  t: translationMocks.t,
}));

const apiMocks = vi.hoisted(() => ({
  loginRequest: vi.fn(),
  userQueryOptions: { queryKey: ["me"], queryFn: vi.fn() },
}));

vi.mock("@/api/user", () => ({
  loginRequest: apiMocks.loginRequest,
  userQueryOptions: apiMocks.userQueryOptions,
}));

const reactQueryMocks = vi.hoisted(() => {
  const queryClient = {
    fetchQuery: vi.fn(),
    setQueryData: vi.fn(),
  };
  const mutationResult = {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
  };
  let lastConfig: unknown;

  const useMutation = vi.fn((config: unknown) => {
    lastConfig = config;

    return mutationResult;
  });
  const useQueryClient = vi.fn(() => queryClient);
  const getLastConfig = () => lastConfig;
  const reset = () => {
    lastConfig = undefined;
    queryClient.fetchQuery.mockReset();
    queryClient.setQueryData.mockClear();
    mutationResult.mutate.mockClear();
    mutationResult.mutateAsync.mockClear();
  };

  return {
    getLastConfig,
    mutationResult,
    queryClient,
    reset,
    useMutation,
    useQueryClient,
  };
});

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );

  return {
    ...actual,
    useMutation: reactQueryMocks.useMutation,
    useQueryClient: reactQueryMocks.useQueryClient,
  };
});

type LoginPayload = { email: string; password: string };
type LoginResponse = {
  statusCode: number;
  message?: string;
  data?: {
    isFirstAccess?: boolean;
    token?: string;
  };
};

type MutationConfig = {
  mutationFn?: (payload: LoginPayload) => Promise<LoginResponse>;
  onError?: (error: unknown) => Promise<void> | void;
  onSuccess?: (response: LoginResponse) => Promise<void> | void;
};

const getMutationConfig = () =>
  reactQueryMocks.getLastConfig() as MutationConfig | undefined;

const runDescribe = describe as (name: string, fn: () => void) => void;
const runTest = test as (name: string, fn: () => void | Promise<void>) => void;

runDescribe("useLogin", () => {
  const invokeHook = useLogin as unknown as () =>
    typeof reactQueryMocks.mutationResult;

  beforeEach(() => {
    apiMocks.loginRequest.mockReset();
    navigateMock.mockClear();
    searchMock.mockReset();
    searchMock.mockReturnValue({});
    toastMocks.success.mockClear();
    toastMocks.warning.mockClear();
    toastMocks.error.mockClear();
    translationMocks.t.mockClear();
    reactQueryMocks.useMutation.mockClear();
    reactQueryMocks.useQueryClient.mockClear();
    reactQueryMocks.reset();
    localStorage.clear();
  });

  runTest("uses loginRequest as mutation function and handles first access", async () => {
    const payload: LoginPayload = { email: "a", password: "p" };
    const response: LoginResponse = {
      statusCode: 200,
      data: { isFirstAccess: true, token: "tok1" },
    };

    apiMocks.loginRequest.mockResolvedValue(response);

    const mutation = invokeHook();

    expect(reactQueryMocks.useMutation).toHaveBeenCalledTimes(1);

    const config = getMutationConfig();

    expect(config?.mutationFn).toBe(apiMocks.loginRequest);

    const result = await config?.mutationFn?.(payload);

    expect(apiMocks.loginRequest).toHaveBeenCalledWith(payload);
    expect(result).toBe(response);

    await config?.onSuccess?.(response);

    expect(toastMocks.warning).toHaveBeenCalledWith("auth.login.toastWarning");
    expect(navigateMock).toHaveBeenCalledWith({ to: "/auth/redefine/tok1" });
    expect(mutation).toBe(reactQueryMocks.mutationResult);
  });

  runTest("stores token and confirms the session when login succeeds", async () => {
    const response: LoginResponse = {
      statusCode: 200,
      data: { token: "tok2" },
    };

    reactQueryMocks.queryClient.fetchQuery.mockResolvedValue({
      name: "Ana",
      userType: "GUEST",
    });

    invokeHook();

    const config = getMutationConfig();

    await config?.onSuccess?.(response);

    expect(localStorage.getItem("token")).toBe("tok2");
    expect(reactQueryMocks.queryClient.fetchQuery).toHaveBeenCalledWith({
      ...apiMocks.userQueryOptions,
      staleTime: 0,
    });
    expect(toastMocks.success).toHaveBeenCalledWith("auth.login.toastSuccess");
    expect(navigateMock).toHaveBeenCalledWith({ to: "/", replace: true });
  });

  runTest("navigates to the preserved redirect target after login", async () => {
    searchMock.mockReturnValue({ redirect: "/reserve/finish" });
    reactQueryMocks.queryClient.fetchQuery.mockResolvedValue({
      name: "Ana",
      userType: "GUEST",
    });

    invokeHook();

    await getMutationConfig()?.onSuccess?.({
      statusCode: 200,
      data: { token: "tok3" },
    });

    expect(navigateMock).toHaveBeenCalledWith({
      to: "/reserve/finish",
      replace: true,
    });
  });

  runTest("ignores external redirect targets", async () => {
    searchMock.mockReturnValue({ redirect: "//evil.example.com" });
    reactQueryMocks.queryClient.fetchQuery.mockResolvedValue({
      name: "Ana",
      userType: "GUEST",
    });

    invokeHook();

    await getMutationConfig()?.onSuccess?.({
      statusCode: 200,
      data: { token: "tok4" },
    });

    expect(navigateMock).toHaveBeenCalledWith({ to: "/", replace: true });
  });

  runTest("discards the token when the session cannot be confirmed", async () => {
    reactQueryMocks.queryClient.fetchQuery.mockResolvedValue(null);

    invokeHook();

    await getMutationConfig()?.onSuccess?.({
      statusCode: 200,
      data: { token: "tok5" },
    });

    expect(localStorage.getItem("token")).toBeNull();
    expect(reactQueryMocks.queryClient.setQueryData).toHaveBeenCalledWith(
      ["me"],
      null,
    );
    expect(toastMocks.error).toHaveBeenCalledWith(
      "auth.login.toastSessionUnavailable",
    );
    expect(toastMocks.success).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  runTest("discards the token when the profile request throws", async () => {
    reactQueryMocks.queryClient.fetchQuery.mockRejectedValue(
      new Error("network down"),
    );

    invokeHook();

    await getMutationConfig()?.onSuccess?.({
      statusCode: 200,
      data: { token: "tok6" },
    });

    expect(localStorage.getItem("token")).toBeNull();
    expect(toastMocks.error).toHaveBeenCalledWith(
      "auth.login.toastSessionUnavailable",
    );
    expect(navigateMock).not.toHaveBeenCalled();
  });

  runTest("shows error toast when response is non-2xx", async () => {
    const response: LoginResponse = { statusCode: 400, message: "Bad" };

    invokeHook();

    const config = getMutationConfig();

    await config?.onSuccess?.(response);

    expect(toastMocks.error).toHaveBeenCalledWith("Bad");
  });

  runTest("uses i18n fallback when non-2xx response has no message", async () => {
    const response: LoginResponse = { statusCode: 500 };

    invokeHook();

    const config = getMutationConfig();

    await config?.onSuccess?.(response);

    expect(translationMocks.t).toHaveBeenCalledWith("auth.login.toastError");
    expect(toastMocks.error).toHaveBeenCalledWith("auth.login.toastError");
  });

  runTest("shows error toast when mutation rejects", async () => {
    const error = new Error("fail");

    invokeHook();

    const config = getMutationConfig();

    await config?.onError?.(error);

    expect(translationMocks.t).toHaveBeenCalledWith("auth.login.toastErrorTryAgain");
    expect(toastMocks.error).toHaveBeenCalledWith("auth.login.toastErrorTryAgain");
  });

  runTest("does nothing when response is 2xx without data", async () => {
    const response: LoginResponse = { statusCode: 200 };

    invokeHook();

    const config = getMutationConfig();

    await config?.onSuccess?.(response);

    expect(localStorage.getItem("token")).toBeNull();
    expect(toastMocks.success).not.toHaveBeenCalled();
    expect(toastMocks.warning).not.toHaveBeenCalled();
    expect(toastMocks.error).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(reactQueryMocks.queryClient.fetchQuery).not.toHaveBeenCalled();
  });
});
