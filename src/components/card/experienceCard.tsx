import { Button } from "@/components/button/defaultButton";
import { Typography } from "@/components/typography";
import { useCartStore } from "@/store/cartStore";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import { CalendarClock, DollarSign, Map, Timer, Users } from "lucide-react";
import { BsSpeedometer2 } from "react-icons/bs";
import { type ComponentType, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useLoadImage } from "@/hooks/shared/useLoadImage";
import { type Experience, ExperienceCategoryCard, isHouseHosting } from "@/types/experience";
import { translateExperienceCategory } from "@/utils/translateExperienceCategory";
import { MarkdownContent } from "@/components/text-areas";

interface CardExperienceProps {
  experience: Experience;
}

const IMAGE_ROTATION_MS = 3000;

const minutesToHours = (minutes?: number | null) =>
  minutes != null ? Number((minutes / 60).toFixed(1)) : undefined;

export function CardExperience({ experience }: CardExperienceProps) {
  const { t, i18n } = useTranslation();

  const locale = useMemo(
    () => (i18n.language?.startsWith("pt") ? "pt-BR" : "en-US"),
    [i18n.language],
  );

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }),
    [locale],
  );

  const decimalFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }),
    [locale],
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    [locale],
  );

  const addItemToCart = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  // Categoria com fallback robusto (evita exibir chave como "Common.trail")
  const translatedCategoryRaw = translateExperienceCategory(
    experience.category,
    t,
    experience.category.toLowerCase(),
  );

  const categoryFallbackMap: Record<string, string> = {
    [ExperienceCategoryCard.TRAIL]: i18n.language?.startsWith("pt") ? "Trilhas" : "Trails",
    [ExperienceCategoryCard.EVENT]: i18n.language?.startsWith("pt") ? "Eventos" : "Events",
    [ExperienceCategoryCard.ROOM]: i18n.language?.startsWith("pt") ? "Quarto" : "Room",
    [ExperienceCategoryCard.HOUSE]: i18n.language?.startsWith("pt") ? "Casa" : "House",
  };

  const categoryLabel =
    translatedCategoryRaw &&
    !translatedCategoryRaw.startsWith("Common.") &&
    !translatedCategoryRaw.includes(".") // heurística para detectar chave não traduzida
      ? translatedCategoryRaw
      : (categoryFallbackMap[experience.category] ?? experience.category.toLowerCase());

  // Labels com fallback caso i18n não esteja carregado no teste
  const minCapacity = Number(experience.minCapacity ?? 1);
  const maxCapacity = Number(experience.capacity ?? 0);
  const rawCapacity = t("cartItem.capacityRange", {
    min: minCapacity,
    max: maxCapacity,
  });
  const capacityFallback = `${minCapacity} - ${maxCapacity} ${
    i18n.language?.startsWith("pt") ? "pessoas" : "people"
  }`;
  const capacityLabel = rawCapacity.startsWith("cartItem.capacity")
    ? capacityFallback
    : rawCapacity.replace(/\s+(a|to)\s+/i, " - ");

  const lengthLabel =
    experience.trailLength != null
      ? (() => {
          const key = "cartItem.length";
          const formatted = decimalFormatter.format(experience.trailLength);
          const txt = t(key, { length: formatted });

          return txt === key ? `${formatted} km` : txt;
        })()
      : undefined;

  const durationLabel =
    experience.durationMinutes != null
      ? (() => {
          const key = "cartItem.duration";
          const hours = decimalFormatter.format(minutesToHours(experience.durationMinutes) ?? 0);
          const txt = t(key, { value: hours });

          return txt === key ? `${hours} h` : txt;
        })()
      : undefined;

  const difficultyLabel = (() => {
    const easyPT = "Fácil";
    const mediumPT = "Médio";
    const hardPT = "Difícil";

    switch (experience.trailDifficulty) {
      case "LIGHT":
        return t("cartItem.difficulty.light") === "cartItem.difficulty.light"
          ? i18n.language?.startsWith("pt")
            ? easyPT
            : "Light"
          : t("cartItem.difficulty.light");
      case "EASY":
        return t("cartItem.difficulty.easy") === "cartItem.difficulty.easy"
          ? i18n.language?.startsWith("pt")
            ? easyPT
            : "Easy"
          : t("cartItem.difficulty.easy");
      case "MEDIUM":
      case "MODERATED":
        return t("cartItem.difficulty.medium") === "cartItem.difficulty.medium"
          ? i18n.language?.startsWith("pt")
            ? mediumPT
            : "Medium"
          : t("cartItem.difficulty.medium");
      case "HARD":
      case "HEAVY":
        return t("cartItem.difficulty.hard") === "cartItem.difficulty.hard"
          ? i18n.language?.startsWith("pt")
            ? hardPT
            : "Hard"
          : t("cartItem.difficulty.hard");
      case "EXTREME":
        return t("cartItem.difficulty.extreme") === "cartItem.difficulty.extreme"
          ? i18n.language?.startsWith("pt")
            ? "Extremo"
            : "Extreme"
          : t("cartItem.difficulty.extreme");
      default:
        return undefined;
    }
  })();

  const eventDateLabel = (() => {
    if (experience.category !== ExperienceCategoryCard.EVENT) return undefined;

    if (experience.startDate && experience.endDate) {
      const key = "cartItem.eventDateRange";
      const from = dateFormatter.format(new Date(experience.startDate));
      const to = dateFormatter.format(new Date(experience.endDate));
      const txt = t(key, { from, to });

      return txt === key ? `${from} – ${to}` : txt;
    }

    const singleDate = experience.startDate ?? experience.endDate;

    return singleDate ? dateFormatter.format(new Date(singleDate)) : undefined;
  })();

  const price = experience.price == null ? null : Number(experience.price);
  const priceMax =
    experience.priceMax == null
      ? price == null
        ? null
        : isHouseHosting(experience.category)
          ? price
          : price * maxCapacity
      : Number(experience.priceMax);
  const priceLabel =
    price != null && Number.isFinite(price) && priceMax != null && Number.isFinite(priceMax)
      ? isHouseHosting(experience.category) || price === priceMax
        ? currencyFormatter.format(price)
        : `${currencyFormatter.format(price)} - ${currencyFormatter.format(priceMax)}`
      : "-";

  const detailLabels: Array<{
    icon: ComponentType<{ className?: string }>;
    text: string;
  }> = [];

  if (experience.category === ExperienceCategoryCard.TRAIL) {
    if (lengthLabel) detailLabels.push({ icon: Map, text: lengthLabel });
    if (durationLabel) detailLabels.push({ icon: Timer, text: durationLabel });
    if (difficultyLabel) detailLabels.push({ icon: BsSpeedometer2, text: difficultyLabel });
  }

  if (experience.category === ExperienceCategoryCard.EVENT && eventDateLabel) {
    detailLabels.push({ icon: CalendarClock, text: eventDateLabel });
  }

  const galleryKey = (experience.images ?? []).map((image) => image.url).join("|");
  const imageUrls = useMemo(() => {
    const gallery = galleryKey.split("|").filter(Boolean).map(resolveImageUrl);

    return gallery.length > 0 ? gallery : [resolveImageUrl(experience.image?.url)];
  }, [galleryKey, experience.image?.url]);

  const [rotationTick, setRotationTick] = useState(0);
  const activeImage = rotationTick % imageUrls.length;

  useEffect(() => {
    if (imageUrls.length < 2) {
      return;
    }

    const rotation = setInterval(() => setRotationTick((tick) => tick + 1), IMAGE_ROTATION_MS);

    return () => clearInterval(rotation);
  }, [imageUrls]);

  const { data: imageLoaded, isLoading: imageLoading } = useLoadImage(imageUrls[0]);

  const addToCartLabel = (() => {
    const key = "experienceCard.addToCart";
    const txt = t(key);

    return txt === key
      ? i18n.language?.startsWith("pt")
        ? "Adicionar ao carrinho"
        : "Add to cart"
      : txt;
  })();

  return (
    <div className="bg-card relative flex w-full max-w-[520px] flex-col overflow-hidden rounded-[20px] shadow-sm">
      <div className="relative w-full overflow-hidden pb-[54%]">
        {imageUrls.map((url, index) => (
          <img
            key={`${url}-${index}`}
            src={url}
            alt=""
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
              index === activeImage && imageLoaded && !imageLoading ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
        {imageLoading && <div className="absolute inset-0 animate-pulse bg-muted" />}
        {imageUrls.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {imageUrls.map((url, index) => (
              <span
                key={`dot-${url}-${index}`}
                className={cn(
                  "h-2 w-2 rounded-full transition-colors",
                  index === activeImage ? "bg-white" : "bg-white/50",
                )}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 px-6 py-5">
        <div className="flex w-full flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <Typography
              variant="h3"
              className="flex items-center p-0 text-[18px] font-bold leading-tight text-main-dark-green"
            >
              {experience.name}
              <span className="capitalize ml-3 h-fit rounded-[30px] bg-banner px-3 py-[6px] text-[11px] font-semibold text-on-banner-text">
                {categoryLabel.charAt(0).toUpperCase() + categoryLabel.slice(1).toLowerCase()}
              </span>
            </Typography>
          </div>

          <MarkdownContent className="text-dark-gray scrollbar-hide m-0 max-h-32 w-full overflow-y-auto text-[14px] font-normal [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm">
            {experience.description ?? ""}
          </MarkdownContent>
        </div>

        {detailLabels.length > 0 && (
          <div className="grid w-full grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 md:grid-cols-3">
            {detailLabels.map(({ icon: Icon, text }, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-full bg-card-labels px-3 py-1.5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-main-dark-green text-white">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-[13px] font-semibold leading-tight text-foreground">
                  {text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-3 px-6 pb-5">
        <div className="flex min-w-0 flex-col gap-2">
          {[
            { icon: Users, text: capacityLabel },
            { icon: DollarSign, text: priceLabel },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-main-dark-green text-white">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-[13px] font-semibold leading-tight text-foreground">
                {text}
              </span>
            </div>
          ))}
        </div>

        <Button
          label={addToCartLabel}
          data-testid="add-to-cart"
          className="shrink-0 rounded-[100px] px-[24px] py-[12px] text-[14px]"
          onClick={() => {
            addItemToCart(experience);
            openCart();
          }}
        />
      </div>
    </div>
  );
}

export default CardExperience;
