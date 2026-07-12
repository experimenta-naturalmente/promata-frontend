import { Button } from "@/components/button/defaultButton";
import ReservationInfoCard from "@/components/card/reservationInfoCard";
import { ReservationsLayout } from "@/components/display/reservationEvents";
import { useIsRoot } from "@/api/user";
import { useDeleteReservation } from "@/hooks/reservations/useDeleteReservation";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/requests/reservation/$reservationGroupId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { reservationGroupId } = Route.useParams();
  const navigate = useNavigate();
  const isRoot = useIsRoot();
  const deleteReservationMutation = useDeleteReservation();

  const handleDeleteReservation = () => {
    if (
      !window.confirm(
        "Tem certeza que deseja excluir esta reserva? Esta ação não pode ser desfeita.",
      )
    ) {
      return;
    }

    deleteReservationMutation.mutate(reservationGroupId, {
      onSuccess: () => {
        void navigate({ to: "/admin/requests", search: { tab: "reservation" } });
      },
    });
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-6 overflow-auto p-4">
        <ReservationInfoCard reservationId={reservationGroupId} isAdminView />
        <div className="mt-6">
          <ReservationsLayout reservationGroupId={reservationGroupId} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {isRoot && (
          <Button
            type="button"
            variant="destructive"
            label="Excluir reserva"
            onClick={handleDeleteReservation}
            disabled={deleteReservationMutation.isPending}
          />
        )}
        <Link to="/admin/requests" search={{ tab: "reservation" }}>
          <Button type="button" variant="ghost" label="Voltar" />
        </Link>
      </div>
    </div>
  );
}
