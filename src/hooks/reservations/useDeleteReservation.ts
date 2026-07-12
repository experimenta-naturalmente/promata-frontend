import { deleteReservation } from "@/api/reservation";
import { toastApiError, toastApiSuccess } from "@/lib/api-message";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ADMIN_REQUESTS_QUERY_KEY } from "@/hooks/requests/use-fetch-request-admin";
import { MY_RESERVATION_KEY } from "./useMyReservations";

export const DELETE_RESERVATION_MUTATION_KEY = ["deleteReservation"];

export function useDeleteReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: DELETE_RESERVATION_MUTATION_KEY,
    mutationFn: (reservationGroupId: string) => deleteReservation(reservationGroupId),
    onSuccess: (response) => {
      toastApiSuccess(response?.data, "Reserva excluída com sucesso");
      void queryClient.invalidateQueries({ queryKey: [ADMIN_REQUESTS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [MY_RESERVATION_KEY] });
    },
    onError: (error) => {
      toastApiError(error, "Erro ao excluir reserva");
    },
  });
}
