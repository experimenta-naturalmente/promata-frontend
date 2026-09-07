import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExperienceApiResponse } from "@/types/experience";

describe("mapExperienceApiResponseToDTO", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("prefers non-prefixed fields, normalizes numbers/booleans and resolves image urls", async () => {
    const resolveImageUrlMock = vi.fn((raw: string) => `cdn/${raw}`);

    vi.doMock("@/utils/resolveImageUrl", () => ({
      resolveImageUrl: resolveImageUrlMock,
    }));

    const { mapExperienceApiResponseToDTO } = await import(
      "@/types/experience"
    );

    const api = {
      id: "exp-42",
      name: "Full Experience",
      description: "A scenic trail",
      category: "TRAIL",
      minCapacity: " 3 ",
      capacity: " 15 ",
      image: { url: "pictures/main.png" },
      startDate: "2025-01-02",
      endDate: "2025-01-03",
      price: "199.99",
      weekDays: ["MONDAY", "FRIDAY"],
      durationMinutes: "180",
      trailDifficulty: "HEAVY",
      trailLength: " 2 ",
      active: "true",
    };

    const dto = mapExperienceApiResponseToDTO(
      api as unknown as ExperienceApiResponse
    );

    expect(resolveImageUrlMock).toHaveBeenCalledWith("pictures/main.png");
    expect(dto).toEqual({
      id: "exp-42",
      name: "Full Experience",
      description: "A scenic trail",
      category: "TRAIL",
      minCapacity: 3,
      capacity: 15,
      startDate: "2025-01-02",
      endDate: "2025-01-03",
      price: 199.99,
      weekDays: ["MONDAY", "FRIDAY"],
      durationMinutes: 180,
      trailDifficulty: "HEAVY",
      trailLength: 2,
      priceMax: null,
      image: { url: "cdn/pictures/main.png" },
      images: [{ url: "cdn/pictures/main.png" }],
      imageId: null,
      active: true,
    });
  });

  it("maps the ordered gallery and keeps the cover as the first entry", async () => {
    vi.doMock("@/utils/resolveImageUrl", () => ({
      resolveImageUrl: (raw: string) => `cdn/${raw}`,
    }));

    const { mapExperienceApiResponseToDTO } = await import("@/types/experience");

    const api = {
      id: "exp-gallery",
      name: "Gallery",
      category: "TRAIL",
      image: { url: "pictures/cover.png" },
      images: [
        { url: "pictures/cover.png" },
        "pictures/second.png",
        { url: null },
        null,
        { url: "pictures/third.png" },
      ],
    };

    const dto = mapExperienceApiResponseToDTO(api as unknown as ExperienceApiResponse);

    expect(dto.image).toEqual({ url: "cdn/pictures/cover.png" });
    expect(dto.images).toEqual([
      { url: "cdn/pictures/cover.png" },
      { url: "cdn/pictures/second.png" },
      { url: "cdn/pictures/third.png" },
    ]);
  });

  it("falls back to prefixed fields when GET fields are absent", async () => {
    const resolveImageUrlMock = vi.fn((raw: string) => `cdn/${raw}`);

    vi.doMock("@/utils/resolveImageUrl", () => ({
      resolveImageUrl: resolveImageUrlMock,
    }));

    const { mapExperienceApiResponseToDTO } = await import(
      "@/types/experience"
    );

    const api = {
      experienceId: "legacy-1",
      experienceName: "Legacy",
      experienceDescription: null,
      experienceCategory: "EVENT",
      experienceMinCapacity: 5,
      experienceCapacity: 30,
      experienceImage: "legacy/banner.jpg",
      experienceStartDate: null,
      experienceEndDate: "2025-12-10",
      experiencePrice: "120",
      experienceWeekDays: ["SUNDAY"],
      trailDurationMinutes: "45",
      trailDifficulty: null,
      trailLength: 10,
      experienceActive: "false",
    };

    const dto = mapExperienceApiResponseToDTO(
      api as unknown as ExperienceApiResponse
    );

    expect(resolveImageUrlMock).toHaveBeenCalledWith("legacy/banner.jpg");
    expect(dto).toEqual({
      id: "legacy-1",
      name: "Legacy",
      description: null,
      category: "EVENT",
      minCapacity: 5,
      capacity: 30,
      startDate: null,
      endDate: "2025-12-10",
      price: 120,
      weekDays: ["SUNDAY"],
      durationMinutes: 45,
      trailDifficulty: null,
      trailLength: 10,
      priceMax: null,
      image: { url: "cdn/legacy/banner.jpg" },
      images: [{ url: "cdn/legacy/banner.jpg" }],
      imageId: null,
      active: false,
    });
  });

  it("returns boolean active values without normalization", async () => {
    vi.doMock("@/utils/resolveImageUrl", () => ({
      resolveImageUrl: (raw: string) => `cdn/${raw}`,
    }));

    const { mapExperienceApiResponseToDTO } = await import(
      "@/types/experience"
    );

    const api = {
      id: "bool-1",
      name: "Boolean Active",
      category: "HOSTING",
      capacity: 5,
      price: 0,
      durationMinutes: 0,
      trailLength: 0,
      active: true,
    };

    const dto = mapExperienceApiResponseToDTO(
      api as unknown as ExperienceApiResponse
    );

    expect(dto.active).toBe(true);
    expect(dto.category).toBe("ROOM");
  });

  it("maps house hosting category to HOUSE", async () => {
    vi.doMock("@/utils/resolveImageUrl", () => ({
      resolveImageUrl: (raw: string) => `cdn/${raw}`,
    }));

    const { mapExperienceApiResponseToDTO } = await import("@/types/experience");

    const dto = mapExperienceApiResponseToDTO({
      id: "house-1",
      name: "Chalé",
      category: "HOSTING_HOUSE",
      capacity: 8,
      price: 400,
    } as unknown as ExperienceApiResponse);

    expect(dto.category).toBe("HOUSE");
  });

  it("defaults active to null when neither status field is provided", async () => {
    vi.doMock("@/utils/resolveImageUrl", () => ({
      resolveImageUrl: (raw: string) => raw,
    }));

    const { mapExperienceApiResponseToDTO } = await import(
      "@/types/experience"
    );

    const api = {
      id: "no-active",
      name: "No Active",
      category: "EVENT",
    };

    const dto = mapExperienceApiResponseToDTO(
      api as unknown as ExperienceApiResponse
    );

    expect(dto.active).toBeNull();
  });

  it("defaults when values are missing or invalid and avoids resolving empty images", async () => {
    const resolveImageUrlMock = vi.fn((raw: string) => `cdn/${raw}`);

    vi.doMock("@/utils/resolveImageUrl", () => ({
      resolveImageUrl: resolveImageUrlMock,
    }));

    const { mapExperienceApiResponseToDTO } = await import(
      "@/types/experience"
    );

    const api = {
      name: undefined,
      category: undefined,
      capacity: "",
      image: null,
      experienceImage: { url: null },
      price: "not-a-number",
      weekDays: null,
      durationMinutes: Number.POSITIVE_INFINITY,
      trailDifficulty: null,
      trailLength: null,
      active: "maybe",
      experienceActive: undefined,
    };

    const dto = mapExperienceApiResponseToDTO(
      api as unknown as ExperienceApiResponse
    );

    expect(resolveImageUrlMock).not.toHaveBeenCalled();
    expect(dto).toEqual({
      id: "unknown",
      name: "",
      description: null,
      category: "EVENT",
      minCapacity: null,
      capacity: null,
      startDate: null,
      endDate: null,
      price: null,
      weekDays: null,
      durationMinutes: null,
      trailDifficulty: null,
      trailLength: null,
      priceMax: null,
      image: null,
      images: [],
      imageId: null,
      active: null,
    });
  });
});

describe("toExperienceCategory", () => {
  it("maps API category values to form enum", async () => {
    const { ExperienceCategory, toExperienceCategory } = await import(
      "@/types/experience"
    );

    expect(toExperienceCategory("HOSTING")).toBe(ExperienceCategory.HOSPEDAGEM);
    expect(toExperienceCategory("HOSTING_HOUSE")).toBe(ExperienceCategory.HOSPEDAGEM_CASA);
    expect(toExperienceCategory("LABORATORY")).toBe(ExperienceCategory.LABORATORIO);
    expect(toExperienceCategory("TRAIL")).toBe(ExperienceCategory.TRILHA);
    expect(toExperienceCategory("EVENT")).toBe(ExperienceCategory.EVENTO);
  });

  it("maps legacy card category values to form enum", async () => {
    const { ExperienceCategory, ExperienceCategoryCard, toExperienceCategory } =
      await import("@/types/experience");

    expect(toExperienceCategory(ExperienceCategoryCard.ROOM)).toBe(
      ExperienceCategory.HOSPEDAGEM,
    );
    expect(toExperienceCategory(ExperienceCategoryCard.HOUSE)).toBe(
      ExperienceCategory.HOSPEDAGEM_CASA,
    );
    expect(toExperienceCategory(ExperienceCategoryCard.LAB)).toBe(
      ExperienceCategory.LABORATORIO,
    );
    expect(toExperienceCategory(ExperienceCategoryCard.TRAIL)).toBe(
      ExperienceCategory.TRILHA,
    );
    expect(toExperienceCategory(ExperienceCategoryCard.EVENT)).toBe(
      ExperienceCategory.EVENTO,
    );
  });

  it("defaults to laboratório when category is missing or unknown", async () => {
    const { ExperienceCategory, toExperienceCategory } = await import(
      "@/types/experience"
    );

    expect(toExperienceCategory(undefined)).toBe(ExperienceCategory.LABORATORIO);
    expect(toExperienceCategory(null)).toBe(ExperienceCategory.LABORATORIO);
    expect(toExperienceCategory("UNKNOWN")).toBe(ExperienceCategory.LABORATORIO);
  });
});

describe("isHouseHosting", () => {
  it("identifies house hosting categories", async () => {
    const { ExperienceCategory, ExperienceCategoryCard, isHouseHosting } = await import(
      "@/types/experience"
    );

    expect(isHouseHosting(ExperienceCategory.HOSPEDAGEM_CASA)).toBe(true);
    expect(isHouseHosting(ExperienceCategoryCard.HOUSE)).toBe(true);
    expect(isHouseHosting("HOSTING_HOUSE")).toBe(true);
    expect(isHouseHosting(ExperienceCategory.HOSPEDAGEM)).toBe(false);
    expect(isHouseHosting(ExperienceCategoryCard.ROOM)).toBe(false);
  });
});
