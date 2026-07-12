import { registerUserAdminRequest } from "@/api/user";
import { toastApiError } from "@/lib/api-message";
import { useMutation } from "@tanstack/react-query";

export function useRegisterAdmin() {
  return useMutation({
    mutationFn: registerUserAdminRequest,
    onError: (error) => {
      toastApiError(error, "Erro inesperado");
    },
  });
}
