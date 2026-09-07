import { isHouseHosting } from "@/types/experience";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function countReservationDays(
  startDate?: string | Date | null,
  endDate?: string | Date | null,
): number {
  if (!startDate || !endDate) {
    return 1;
  }

  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  const startMs = start.getTime();
  const endMs = end.getTime();

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return 1;
  }

  const diffDays = Math.round((endMs - startMs) / MS_PER_DAY);

  return Math.max(1, diffDays + 1);
}

type EstimatedReservationInput = {
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  membersCount?: number;
  experience?: {
    price?: string | number | null;
    category?: string | null;
  };
};

export function estimatedReservationTotal(reservation: EstimatedReservationInput): number {
  const unitPrice = Number(reservation.experience?.price ?? 0);
  const billedPeople = isHouseHosting(reservation.experience?.category)
    ? 1
    : Number(reservation.membersCount ?? 0);

  if (!Number.isFinite(unitPrice) || !Number.isFinite(billedPeople)) {
    return 0;
  }

  return unitPrice * billedPeople * countReservationDays(reservation.startDate, reservation.endDate);
}

export function estimatedGroupTotal(reservations: EstimatedReservationInput[]): number {
  return reservations.reduce((total, reservation) => total + estimatedReservationTotal(reservation), 0);
}
