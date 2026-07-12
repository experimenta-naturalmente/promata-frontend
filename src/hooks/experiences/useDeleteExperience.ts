/* eslint-disable @typescript-eslint/no-floating-promises */
import { deleteExperience } from "@/api/experience";
import { toastApiError, toastApiSuccess } from "@/lib/api-message";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ADMIN_EXPERIENCES_QUERY_KEY } from "./useFetchAdminExperiences";

export function useDeleteExperience() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (experienceId: string) => deleteExperience(experienceId),
    onSuccess: (response) => {
      toastApiSuccess(response?.data, "Experiência excluída com sucesso");
      queryClient.invalidateQueries({ queryKey: ["experiences"] });
      queryClient.invalidateQueries({ queryKey: ["experience"] });
      queryClient.invalidateQueries({ queryKey: [ADMIN_EXPERIENCES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["experienceAdjustments"] });
    },
    onError: (error) => {
      toastApiError(error, "Erro ao excluir experiência");
    },
  });
}
