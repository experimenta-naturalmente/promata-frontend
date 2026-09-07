import { resolveImageUrl } from "@/utils/resolveImageUrl";
export enum ExperienceCategory {
  TRILHA = "TRAIL",
  EVENTO = "EVENT",
  HOSPEDAGEM = "HOSTING",
  HOSPEDAGEM_CASA = "HOSTING_HOUSE",
  LABORATORIO = "LABORATORY",
}

export const EXPERIENCE_CATEGORY_LABEL = {
  [ExperienceCategory.EVENTO]: "category.event",
  [ExperienceCategory.TRILHA]: "category.trail",
  [ExperienceCategory.HOSPEDAGEM]: "category.hosting",
  [ExperienceCategory.HOSPEDAGEM_CASA]: "category.house",
  [ExperienceCategory.LABORATORIO]: "category.laboratory",
} as Record<string | number, string>;

export const EXPERIENCE_CATEGORY_STYLE_COLOR = {
  [ExperienceCategory.EVENTO]: "bg-blue-100 text-blue-800",
  [ExperienceCategory.TRILHA]: "bg-cyan-100 text-cyan-800",
  [ExperienceCategory.HOSPEDAGEM]: "bg-yellow-100 text-yellow-800",
  [ExperienceCategory.HOSPEDAGEM_CASA]: "bg-amber-100 text-amber-800",
  [ExperienceCategory.LABORATORIO]: "bg-purple-100 text-purple-800",
} as Record<string | number, string>;

export enum ExperienceCategoryCard {
  TRAIL = "TRAIL",
  EVENT = "EVENT",
  ROOM = "ROOM",
  HOUSE = "HOUSE",
  LAB = "LAB",
}

export type ExperienceWeekDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface ExperienceTuningData {
  experienceId?: string;
  men: number;
  women: number;
  from: string;
  to: string;
  savedAt: string;
}

export type TrailDifficulty =
  | "LIGHT"
  | "MODERATED"
  | "HEAVY"
  | "EXTREME"
  | (string & { _?: never });

type RawNumber = number | string | null | undefined;

export type ExperienceApiImage =
  | string
  | {
      url?: string | null;
    }
  | null
  | undefined;

export interface ExperienceApiResponse {
  id?: string | null;
  name?: string;
  description?: string | null;
  category?: ExperienceCategory;
  minCapacity?: RawNumber;
  capacity?: RawNumber;
  image?: ExperienceApiImage;
  images?: ExperienceApiImage[] | null;
  startDate?: string | null;
  endDate?: string | null;
  price?: RawNumber;
  priceMax?: RawNumber;
  weekDays?: ExperienceWeekDay[] | null;
  durationMinutes?: RawNumber;
  trailDifficulty?: TrailDifficulty | null;
  trailLength?: RawNumber;
  active?: boolean | string | null;

  // API POST/PATCH usa prefixo experience (mantido para compatibilidade)
  experienceId?: string | null;
  experienceName?: string;
  experienceDescription?: string | null;
  experienceCategory?: ExperienceCategory;
  experienceMinCapacity?: RawNumber;
  experienceCapacity?: RawNumber;
  experienceImage?: ExperienceApiImage;
  experienceImages?: ExperienceApiImage[] | null;
  experienceStartDate?: string | null;
  experienceEndDate?: string | null;
  experiencePrice?: RawNumber;
  experienceWeekDays?: ExperienceWeekDay[] | null;
  trailDurationMinutes?: RawNumber;
  experienceActive?: boolean | string | null;
}

export interface ExperienceDTO {
  id: string;
  name: string;
  description?: string | null;
  category: ExperienceCategoryCard;
  minCapacity?: number | null;
  capacity?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  price?: number | null;
  priceMax?: number | null;
  weekDays?: ExperienceWeekDay[] | null;
  durationMinutes?: number | null;
  trailDifficulty?: TrailDifficulty | null;
  trailLength?: number | null;
  image?: { url: string } | null;
  images?: { url: string }[];
  imageId?: string | null;
  active?: boolean | null;
}

export type Experience = ExperienceDTO;

const CATEGORY_CARD_MAP: Record<ExperienceCategory, ExperienceCategoryCard> = {
  [ExperienceCategory.TRILHA]: ExperienceCategoryCard.TRAIL,
  [ExperienceCategory.EVENTO]: ExperienceCategoryCard.EVENT,
  [ExperienceCategory.HOSPEDAGEM]: ExperienceCategoryCard.ROOM,
  [ExperienceCategory.HOSPEDAGEM_CASA]: ExperienceCategoryCard.HOUSE,
  [ExperienceCategory.LABORATORIO]: ExperienceCategoryCard.LAB,
};

const CATEGORY_CARD_REVERSE_MAP: Record<ExperienceCategoryCard, ExperienceCategory> = {
  [ExperienceCategoryCard.TRAIL]: ExperienceCategory.TRILHA,
  [ExperienceCategoryCard.EVENT]: ExperienceCategory.EVENTO,
  [ExperienceCategoryCard.ROOM]: ExperienceCategory.HOSPEDAGEM,
  [ExperienceCategoryCard.HOUSE]: ExperienceCategory.HOSPEDAGEM_CASA,
  [ExperienceCategoryCard.LAB]: ExperienceCategory.LABORATORIO,
};

export const EXPERIENCE_CATEGORY_FORM_LABEL: Record<ExperienceCategory, string> = {
  [ExperienceCategory.LABORATORIO]: "Laboratório",
  [ExperienceCategory.TRILHA]: "Trilha",
  [ExperienceCategory.HOSPEDAGEM]: "Hospedagem quarto",
  [ExperienceCategory.HOSPEDAGEM_CASA]: "Hospedagem casa",
  [ExperienceCategory.EVENTO]: "Evento",
};

export function isHouseHosting(
  category: string | ExperienceCategory | ExperienceCategoryCard | null | undefined,
): boolean {
  if (!category) {
    return false;
  }

  const value = String(category).trim().toUpperCase();

  return (
    value === ExperienceCategory.HOSPEDAGEM_CASA ||
    value === ExperienceCategoryCard.HOUSE ||
    value === "CASA"
  );
}

export function toExperienceCategory(
  category: string | ExperienceCategory | ExperienceCategoryCard | null | undefined,
): ExperienceCategory {
  if (!category) {
    return ExperienceCategory.LABORATORIO;
  }

  if (Object.values(ExperienceCategory).includes(category as ExperienceCategory)) {
    return category as ExperienceCategory;
  }

  if (category in CATEGORY_CARD_REVERSE_MAP) {
    return CATEGORY_CARD_REVERSE_MAP[category as ExperienceCategoryCard];
  }

  return ExperienceCategory.LABORATORIO;
}

const toNumberOrNull = (value: RawNumber): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return null;
    }

    const parsed = Number(trimmed);

    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

const mapImage = (image: ExperienceApiImage): { url: string } | null => {
  if (!image) {
    return null;
  }

  const rawUrl = typeof image === "string" ? image : image.url;

  if (!rawUrl) {
    return null;
  }

  return { url: resolveImageUrl(rawUrl) };
};

const mapGallery = (
  images: ExperienceApiImage[] | null | undefined,
  cover: { url: string } | null,
): { url: string }[] => {
  const mapped = (images ?? [])
    .map(mapImage)
    .filter((image): image is { url: string } => image !== null);

  if (mapped.length > 0) {
    return mapped;
  }

  return cover ? [cover] : [];
};

const toBooleanOrNull = (value: unknown): boolean | null => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return null;
};

export const mapExperienceApiResponseToDTO = (apiExperience: ExperienceApiResponse): Experience => {
  // Prioriza campos sem prefixo (GET) e usa prefixo como fallback (POST/PATCH)
  const rawCategory = apiExperience.category ?? apiExperience.experienceCategory;
  const category = rawCategory
    ? CATEGORY_CARD_MAP[toExperienceCategory(rawCategory)]
    : ExperienceCategoryCard.EVENT;

  const id = apiExperience.id ?? apiExperience.experienceId ?? "unknown";
  const name = apiExperience.name ?? apiExperience.experienceName ?? "";
  const image = mapImage(apiExperience.image ?? apiExperience.experienceImage);

  return {
    id,
    name,
    description: apiExperience.description ?? apiExperience.experienceDescription ?? null,
    category,
    minCapacity: toNumberOrNull(apiExperience.minCapacity ?? apiExperience.experienceMinCapacity),
    capacity: toNumberOrNull(apiExperience.capacity ?? apiExperience.experienceCapacity),
    startDate: apiExperience.startDate ?? apiExperience.experienceStartDate ?? null,
    endDate: apiExperience.endDate ?? apiExperience.experienceEndDate ?? null,
    price: toNumberOrNull(apiExperience.price ?? apiExperience.experiencePrice),
    priceMax: toNumberOrNull(apiExperience.priceMax),
    weekDays: apiExperience.weekDays ?? apiExperience.experienceWeekDays ?? null,
    durationMinutes: toNumberOrNull(
      apiExperience.durationMinutes ?? apiExperience.trailDurationMinutes,
    ),
    trailDifficulty: apiExperience.trailDifficulty ?? null,
    trailLength: toNumberOrNull(apiExperience.trailLength),
    image,
    images: mapGallery(apiExperience.images ?? apiExperience.experienceImages, image),
    imageId: null,
    active: toBooleanOrNull(apiExperience.active ?? apiExperience.experienceActive ?? null),
  };
};
