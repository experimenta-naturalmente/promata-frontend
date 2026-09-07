import { describe, expect, it } from "vitest";
import {
  countReservationDays,
  estimatedGroupTotal,
  estimatedReservationTotal,
} from "@/utils/reservationEstimatedTotal";

describe("reservationEstimatedTotal", () => {
  it("counts inclusive days and keeps a one-day minimum", () => {
    expect(countReservationDays("2025-01-01T00:00:00.000Z", "2025-01-03T00:00:00.000Z")).toBe(3);
    expect(countReservationDays("2025-01-01T10:00:00.000Z", "2025-01-01T12:00:00.000Z")).toBe(1);
    expect(countReservationDays(null, "2025-01-01T00:00:00.000Z")).toBe(1);
  });

  it("estimates a reservation as (price * people) * days", () => {
    expect(
      estimatedReservationTotal({
        startDate: "2025-01-01T00:00:00.000Z",
        endDate: "2025-01-02T00:00:00.000Z",
        membersCount: 4,
        experience: { price: "50" },
      }),
    ).toBe(400);
  });

  it("estimates house hosting as price * days only", () => {
    expect(
      estimatedReservationTotal({
        startDate: "2025-01-01T00:00:00.000Z",
        endDate: "2025-01-03T00:00:00.000Z",
        membersCount: 6,
        experience: { price: 200, category: "HOSTING_HOUSE" },
      }),
    ).toBe(600);
  });

  it("sums estimated totals across a reservation group", () => {
    expect(
      estimatedGroupTotal([
        {
          startDate: "2025-01-01T00:00:00.000Z",
          endDate: "2025-01-03T00:00:00.000Z",
          membersCount: 3,
          experience: { price: 80 },
        },
        {
          startDate: "2025-01-01T00:00:00.000Z",
          endDate: "2025-01-01T00:00:00.000Z",
          membersCount: 2,
          experience: { price: 50 },
        },
      ]),
    ).toBe(820);
  });
});
