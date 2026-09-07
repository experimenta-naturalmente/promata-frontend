import { useCallback, useEffect, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import type { ExperienceTuningData } from "@/types/experience";

interface UseExperienceTuningOptions {
  experienceId?: string;
  persist?: boolean;
  initialData?: ExperienceTuningData | null;
  defaultMen?: number;
  defaultWomen?: number;
  onLoad?: (data: ExperienceTuningData) => void;
  onSave?: (data: ExperienceTuningData) => void;
}

const toSafeNumber = (value: number | string | null | undefined): number => {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);

  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }

  return numeric;
};

const toCountString = (value: number): string => (value > 0 ? String(value) : "");

const toDateOrNull = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const isExperienceTuningData = (value: unknown): value is ExperienceTuningData => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Partial<ExperienceTuningData>;

  return typeof data.from === "string" && typeof data.to === "string";
};

export function useExperienceTuning({
  experienceId,
  persist = true,
  initialData,
  defaultMen = 0,
  defaultWomen = 0,
  onLoad,
  onSave,
}: UseExperienceTuningOptions) {
  const [range, setRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [men, setMen] = useState<string>(() => toCountString(toSafeNumber(defaultMen)));
  const [women, setWomen] = useState<string>(() => toCountString(toSafeNumber(defaultWomen)));
  const [saved, setSaved] = useState(false);
  const [savedRange, setSavedRange] = useState<DateRange | undefined>();
  const [savedMen, setSavedMen] = useState(() => toSafeNumber(defaultMen));
  const [savedWomen, setSavedWomen] = useState(() => toSafeNumber(defaultWomen));

  const storageKey = experienceId && persist ? `experience_tuning_${experienceId}` : undefined;
  const previousInitialRef = useRef<ExperienceTuningData | null>(null);
  const isFirstDefaultsSync = useRef(true);
  const savedRef = useRef(saved);
  const previousDefaultsRef = useRef({
    men: toSafeNumber(defaultMen),
    women: toSafeNumber(defaultWomen),
  });

  savedRef.current = saved;

  const applyData = useCallback(
    (data: ExperienceTuningData | null | undefined, markSaved: boolean) => {
      if (!data) return;

      const fromDate = toDateOrNull(data.from);
      const toDate = toDateOrNull(data.to);

      if (!fromDate || !toDate) {
        return;
      }

      const menValue = Math.max(toSafeNumber(data.men), toSafeNumber(defaultMen));
      const womenValue = Math.max(toSafeNumber(data.women), toSafeNumber(defaultWomen));

      const normalizedRange: DateRange = { from: fromDate, to: toDate };

      setRange(normalizedRange);
      setSavedRange(normalizedRange);
      setMen(String(menValue));
      setWomen(String(womenValue));
      setSavedMen(menValue);
      setSavedWomen(womenValue);
      setSaved(markSaved);
    },
    [defaultMen, defaultWomen]
  );

  const reset = useCallback(() => {
    const menValue = toSafeNumber(defaultMen);
    const womenValue = toSafeNumber(defaultWomen);

    setRange({ from: undefined, to: undefined });
    setMen(toCountString(menValue));
    setWomen(toCountString(womenValue));
    setSaved(false);
    setSavedRange(undefined);
    setSavedMen(menValue);
    setSavedWomen(womenValue);

    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* noop: storage may be unavailable */
      }
    }
  }, [defaultMen, defaultWomen, storageKey]);

  const load = useCallback(() => {
    if (!storageKey) return;

    try {
      const raw = localStorage.getItem(storageKey);

      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);

      if (!isExperienceTuningData(parsed)) return;

      applyData(parsed, true);
      onLoad?.(parsed);
    } catch {
      /* noop: storage access or parsing failed */
    }
  }, [applyData, onLoad, storageKey]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (initialData) {
      applyData(initialData, true);
      previousInitialRef.current = initialData;
    } else if (previousInitialRef.current) {
      reset();
      previousInitialRef.current = null;
    }
  }, [initialData, applyData, reset]);

  useEffect(() => {
    const nextMen = toSafeNumber(defaultMen);
    const nextWomen = toSafeNumber(defaultWomen);

    if (isFirstDefaultsSync.current) {
      isFirstDefaultsSync.current = false;
      previousDefaultsRef.current = { men: nextMen, women: nextWomen };
      return;
    }

    const previousDefaults = previousDefaultsRef.current;

    setMen((current) => {
      const currentNumber = current === "" ? 0 : toSafeNumber(current);

      if (currentNumber === previousDefaults.men || currentNumber < nextMen) {
        return toCountString(nextMen);
      }

      return current;
    });
    setWomen((current) => {
      const currentNumber = current === "" ? 0 : toSafeNumber(current);

      if (currentNumber === previousDefaults.women || currentNumber < nextWomen) {
        return toCountString(nextWomen);
      }

      return current;
    });

    previousDefaultsRef.current = { men: nextMen, women: nextWomen };

    if (!savedRef.current) {
      setSavedMen(nextMen);
      setSavedWomen(nextWomen);
    }
  }, [defaultMen, defaultWomen]);

  const save = useCallback(() => {
    if (!range.from || !range.to) return;

    const menValue = men === "" ? 0 : toSafeNumber(men);
    const womenValue = women === "" ? 0 : toSafeNumber(women);

    const payload: ExperienceTuningData = {
      experienceId,
      men: menValue,
      women: womenValue,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      savedAt: new Date().toISOString(),
    };

    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {
        /* noop: best effort storage */
      }
    }

    setSavedRange(range);
    setSaved(true);
    setSavedMen(menValue);
    setSavedWomen(womenValue);

    onSave?.(payload);

    return payload;
  }, [experienceId, men, onSave, range, storageKey, women]);

  return {
    range,
    setRange,
    men,
    setMen,
    women,
    setWomen,
    saved,
    savedRange,
    savedMen,
    savedWomen,
    save,
    reset,
  };
}
