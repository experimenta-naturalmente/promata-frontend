import { deleteUser } from "@/api/user";
import { toastApiError, toastApiSuccess } from "@/lib/api-message";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ADMIN_USERS_QUERY_KEY } from "./useFetchAdminUsers";

export const DELETE_USER_MUTATION_KEY = ["deleteUser"];

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const { mutateAsync } = useMutation({
    mutationKey: DELETE_USER_MUTATION_KEY,
    mutationFn: async (id: string) => await deleteUser(id),
    onSuccess: async (response) => {
      toastApiSuccess(response?.data, "Usuário excluído com sucesso");
      await queryClient.refetchQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] });
    },
    onError: (error) => {
      toastApiError(error, "Erro ao excluir usuário");
    },
  });

  return { handleDeleteUser: mutateAsync };
};
