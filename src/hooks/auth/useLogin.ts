/* eslint-disable @typescript-eslint/no-floating-promises */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type CurrentUser, loginRequest, userQueryOptions } from "@/api/user";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { appToast } from "@/components/toast/toast";
import { AUTH_TOKEN_STORAGE_KEY } from "@/utils/consts/auth-consts";
import { t } from "i18next";

/**
 * Só aceita caminhos internos, para o parâmetro `redirect` não virar um vetor de
 * redirecionamento aberto. O cast existe porque o destino só é conhecido em runtime.
 */
function sanitizeRedirect(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/" as const;
  }

  return value as "/";
}

export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const handleChangePassword = (token: string) => {
    navigate({ to: `/auth/redefine/${token}` });
  };

  return useMutation({
    mutationFn: loginRequest,
    onSuccess: async (response) => {
      if (response.statusCode >= 200 && response.statusCode < 300) {
        if (response.data?.isFirstAccess) {
          appToast.warning(t("auth.login.toastWarning"));

          return handleChangePassword(response.data.token);
        }
        if (response.data?.token) {
          localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, response.data.token);

          // O token só vale se o perfil for carregado: sem essa confirmação o
          // login "sucede" enquanto o resto do app continua tratando o usuário
          // como deslogado. `staleTime: 0` força ir na rede em vez de reusar o
          // `null` que ficou em cache enquanto não havia token.
          let user: CurrentUser | null = null;

          try {
            user = await queryClient.fetchQuery({
              ...userQueryOptions,
              staleTime: 0,
            });
          } catch {
            user = null;
          }

          if (!user) {
            localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
            queryClient.setQueryData(userQueryOptions.queryKey, null);
            appToast.error(t("auth.login.toastSessionUnavailable"));

            return;
          }

          appToast.success(t("auth.login.toastSuccess"));
          navigate({ to: sanitizeRedirect(search?.redirect), replace: true });
        }
      } else {
        appToast.error(response.message || t("auth.login.toastError"));
      }
    },
    onError: () => {
      appToast.error(t("auth.login.toastErrorTryAgain"));
    },
  });
}
