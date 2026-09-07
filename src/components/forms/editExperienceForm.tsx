/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { Button } from "@/components/button/defaultButton";
import { TextInput } from "@/components/input/textInput";
import { appToast } from "@/components/toast/toast";
import { toastApiError, toastApiSuccess } from "@/lib/api-message";
import { Typography } from "@/components/typography/typography";
import { Button as ShadcnButton } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import type { UpdateExperiencePayload } from "@/api/experience";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  EXPERIENCE_CATEGORY_FORM_LABEL,
  ExperienceCategory,
  toExperienceCategory,
} from "@/types/experience";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bed,
  Building2,
  Calendar,
  CalendarIcon,
  FlaskConical,
  Home,
  ImagePlus,
  Loader,
  Mountain,
  Upload,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import Modal from "@/components/ui/modal";
import getCroppedImg from "@/utils/cropImage";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useGetExperience, useUpdateExperience } from "@/hooks";
import { MarkdownTextArea } from "@/components/text-areas";

const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const formSchema = z
  .object({
    experienceName: z.string().min(2, "Informe o nome da experiência"),
    experienceDescription: z.string().min(2, "Informe a descrição da experiência"),
    experienceCategory: z.nativeEnum(ExperienceCategory),
    experienceMinCapacity: z.string().min(1, "Informe a quantidade mínima de pessoas"),
    experienceCapacity: z.string().min(1, "Informe a quantidade máxima de pessoas"),
    experienceImages: z
      .array(z.union([z.instanceof(File), z.string()]))
      .min(1, "Selecione ao menos uma imagem para a experiência")
      .max(MAX_IMAGES, `Selecione no máximo ${MAX_IMAGES} imagens`),
    experienceStartDate: z.union([z.date(), z.string()]).optional(),
    experienceEndDate: z.union([z.date(), z.string()]).optional(),
    experiencePrice: z.string().optional(),
    experienceWeekDays: z.array(z.string()).optional().default([]),
    trailDurationMinutes: z.string().optional(),
    trailDifficulty: z.string().optional(),
    trailLength: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const startDate =
      data.experienceStartDate instanceof Date
        ? data.experienceStartDate
        : data.experienceStartDate
          ? new Date(data.experienceStartDate)
          : null;
    const endDate =
      data.experienceEndDate instanceof Date
        ? data.experienceEndDate
        : data.experienceEndDate
          ? new Date(data.experienceEndDate)
          : null;

    if (endDate && startDate && endDate < startDate) {
      ctx.addIssue({
        code: "custom",
        message: "A data de fim deve ser posterior à data de início",
        path: ["experienceEndDate"],
      });
    }

    const minCapacity = Number(data.experienceMinCapacity);
    const maxCapacity = Number(data.experienceCapacity);
    const isValidMin = Number.isInteger(minCapacity) && minCapacity >= 1;
    const isValidMax = Number.isInteger(maxCapacity) && maxCapacity >= 1;

    if (!isValidMin) {
      ctx.addIssue({
        code: "custom",
        message: "A quantidade mínima deve ser um número inteiro a partir de 1",
        path: ["experienceMinCapacity"],
      });
    }

    if (!isValidMax) {
      ctx.addIssue({
        code: "custom",
        message: "A quantidade máxima deve ser um número inteiro a partir de 1",
        path: ["experienceCapacity"],
      });
    }

    if (isValidMin && isValidMax && minCapacity > maxCapacity) {
      ctx.addIssue({
        code: "custom",
        message: "A quantidade máxima deve ser maior ou igual à mínima",
        path: ["experienceCapacity"],
      });
    }

    if (data.experienceCategory === ExperienceCategory.TRILHA) {
      const hasValidMinutes =
        !!data.trailDurationMinutes && parseFloat(data.trailDurationMinutes) > 0;

      if (!hasValidMinutes) {
        ctx.addIssue({
          code: "custom",
          message: "Informe a duração em minutos",
          path: ["trailDurationMinutes"],
        });
      }

      if (!data.trailDifficulty || data.trailDifficulty.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Informe a dificuldade da trilha",
          path: ["trailDifficulty"],
        });
      }

      if (!data.trailLength || data.trailLength.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Informe o comprimento da trilha",
          path: ["trailLength"],
        });
      }
    }
  });

const WEEK_DAYS = [
  { value: "MONDAY", label: "Segunda-feira" },
  { value: "TUESDAY", label: "Terça-feira" },
  { value: "WEDNESDAY", label: "Quarta-feira" },
  { value: "THURSDAY", label: "Quinta-feira" },
  { value: "FRIDAY", label: "Sexta-feira" },
  { value: "SATURDAY", label: "Sábado" },
  { value: "SUNDAY", label: "Domingo" },
];

const DIFFICULTY_LEVELS = [
  { value: "LIGHT", label: "Leve" },
  { value: "MODERATED", label: "Moderado" },
  { value: "HEAVY", label: "Pesado" },
  { value: "EXTREME", label: "Extremo" },
];

const getCategoryIcon = (category: ExperienceCategory) => {
  switch (category) {
    case ExperienceCategory.LABORATORIO:
      return <FlaskConical className="h-4 w-4" />;
    case ExperienceCategory.TRILHA:
      return <Mountain className="h-4 w-4" />;
    case ExperienceCategory.HOSPEDAGEM:
      return <Bed className="h-4 w-4" />;
    case ExperienceCategory.HOSPEDAGEM_CASA:
      return <Home className="h-4 w-4" />;
    case ExperienceCategory.EVENTO:
      return <Calendar className="h-4 w-4" />;
    default:
      return <Building2 className="h-4 w-4" />;
  }
};

const formatPrice = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  const cents = parseInt(numbers) || 0;
  const formatted = (cents / 100).toFixed(2).replace(".", ",");

  return formatted;
};

const parsePrice = (formattedValue: string) => {
  const numbers = formattedValue.replace(/\D/g, "");

  return parseInt(numbers) || 0;
};

interface EditExperienceProps {
  experienceId: string;
}

export function EditExperience({ experienceId }: EditExperienceProps) {
  const navigate = useNavigate();
  const { data: experience, isLoading: isLoadingExperience } = useGetExperience(experienceId);
  const { mutate } = useUpdateExperience(experienceId);
  const [previews, setPreviews] = useState<string[]>([]);
  const previewsRef = useRef<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [priceDisplay, setPriceDisplay] = useState<string>("");

  const form = useForm<z.input<typeof formSchema>, any, z.output<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      experienceName: "",
      experienceDescription: "",
      experienceCategory: ExperienceCategory.LABORATORIO,
      experienceMinCapacity: "1",
      experienceCapacity: "1",
      experienceImages: [],
      experienceStartDate: undefined,
      experienceEndDate: undefined,
      experiencePrice: "0",
      experienceWeekDays: [],
      trailDurationMinutes: undefined,
      trailDifficulty: undefined,
      trailLength: undefined,
    },
  });

  const watchedCategory = form.watch("experienceCategory");
  const watchedStartDate = form.watch("experienceStartDate");
  const watchedEndDate = form.watch("experienceEndDate");

  // Load experience data into form
  useEffect(() => {
    if (experience) {
      // Set price display
      if (experience.price) {
        const priceInCents = experience.price * 100;
        const formatted = formatPrice(String(priceInCents));

        setPriceDisplay(formatted);
      }

      const gallery = experience.images?.length
        ? experience.images.map(({ url }) => url)
        : experience.image
          ? [experience.image.url]
          : [];

      setPreviews(gallery);

      // Reset form with all values at once
      form.reset({
        experienceName: experience.name,
        experienceDescription: experience.description || "",
        experienceCategory: toExperienceCategory(experience.category),
        experienceMinCapacity: String(experience.minCapacity || 1),
        experienceCapacity: String(experience.capacity || 1),
        experienceStartDate: experience.startDate || undefined,
        experienceEndDate: experience.endDate || undefined,
        experiencePrice: experience.price ? String(experience.price) : "0",
        experienceWeekDays: experience.weekDays || [],
        trailDurationMinutes: experience.durationMinutes
          ? String(experience.durationMinutes)
          : undefined,
        trailDifficulty: experience.trailDifficulty || undefined,
        trailLength: experience.trailLength ? String(experience.trailLength) : undefined,
        experienceImages: gallery,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experience]);

  useEffect(() => {
    const startDate =
      watchedStartDate instanceof Date
        ? watchedStartDate
        : watchedStartDate
          ? new Date(watchedStartDate)
          : null;
    const endDate =
      watchedEndDate instanceof Date
        ? watchedEndDate
        : watchedEndDate
          ? new Date(watchedEndDate)
          : null;

    if (startDate && endDate && endDate < startDate) {
      form.setValue("experienceEndDate", undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedStartDate, watchedEndDate]);

  const getDisabledDates = (isStartDate: boolean) => {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    if (isStartDate) {
      return { before: today };
    } else {
      const startDate =
        watchedStartDate instanceof Date
          ? watchedStartDate
          : watchedStartDate
            ? new Date(watchedStartDate)
            : null;

      if (startDate) {
        return {
          before: startDate > today ? startDate : today,
        };
      }

      return { before: today };
    }
  };

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(
    () => () => {
      previewsRef.current.forEach((preview) => {
        if (preview.startsWith("blob:")) {
          URL.revokeObjectURL(preview);
        }
      });
    },
    [],
  );

  useEffect(() => {
    if (cropSource || isReadingFile || pendingFiles.length === 0) {
      return;
    }

    const [next, ...rest] = pendingFiles;
    const reader = new FileReader();

    setIsReadingFile(true);
    reader.onload = (ev) => {
      setCropSource(ev.target?.result as string);
      setPendingFiles(rest);
      setIsReadingFile(false);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(next);
  }, [pendingFiles, cropSource, isReadingFile]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);

    e.target.value = "";

    if (files.length === 0) {
      return;
    }

    const images = files.filter((file) => file.type.startsWith("image/"));

    if (images.length < files.length) {
      appToast.error("Por favor, selecione apenas arquivos de imagem.");
    }

    if (images.some((file) => file.size > MAX_IMAGE_BYTES)) {
      appToast.error("Arquivo muito grande. Tamanho máximo: 10MB");

      return;
    }

    const alreadyTaken =
      (form.getValues("experienceImages") ?? []).length + pendingFiles.length + (cropSource ? 1 : 0);
    const availableSlots = MAX_IMAGES - alreadyTaken;

    if (availableSlots <= 0) {
      appToast.error(`A experiência pode ter no máximo ${MAX_IMAGES} imagens.`);

      return;
    }

    if (images.length > availableSlots) {
      appToast.error(`A experiência pode ter no máximo ${MAX_IMAGES} imagens.`);
    }

    setPendingFiles((queue) => [...queue, ...images.slice(0, availableSlots)]);
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleCropSave = useCallback(async () => {
    if (!cropSource || !croppedAreaPixels) return;

    const croppedFile = await getCroppedImg(cropSource, croppedAreaPixels, 400, 200);

    form.setValue("experienceImages", [...(form.getValues("experienceImages") ?? []), croppedFile], {
      shouldValidate: true,
    });
    setPreviews((current) => [...current, URL.createObjectURL(croppedFile)]);
    setCropSource(null);
  }, [cropSource, croppedAreaPixels, form]);

  const handleCropSkip = useCallback(() => {
    setCropSource(null);
  }, []);

  const handleRemoveImage = (index: number) => {
    form.setValue(
      "experienceImages",
      (form.getValues("experienceImages") ?? []).filter((_, position) => position !== index),
      { shouldValidate: true },
    );
    setPreviews((current) => {
      const removed = current[index];

      if (removed?.startsWith("blob:")) {
        URL.revokeObjectURL(removed);
      }

      return current.filter((_, position) => position !== index);
    });
  };

  const onSubmit = form.handleSubmit((data) => {
    const payload: UpdateExperiencePayload = {
      experienceName: data.experienceName,
      experienceDescription: data.experienceDescription,
      experienceCategory: data.experienceCategory,
      experienceMinCapacity: data.experienceMinCapacity,
      experienceCapacity: data.experienceCapacity,
      experienceImages: data.experienceImages,
      experienceStartDate: data.experienceStartDate,
      experienceEndDate: data.experienceEndDate,
      experiencePrice: data.experiencePrice || "0",
      experienceWeekDays: (data.experienceWeekDays ?? []).map((day) => day.toUpperCase()),
      trailDurationMinutes: data.trailDurationMinutes,
      trailDifficulty: data.trailDifficulty,
      trailLength: data.trailLength,
    };

    mutate(payload, {
      onSuccess: (response) => {
        toastApiSuccess(response?.data, "Experiência atualizada com sucesso");
        navigate({ to: "/admin/experiences" });
      },
      onError: (error) => {
        toastApiError(error, "Erro ao atualizar experiência");
      },
    });
  });

  if (isLoadingExperience) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="h-8 w-8 animate-spin text-contrast-green" />
      </div>
    );
  }

  return (
    <div className="pb-8 pt-6 justify-items-center">
      <div className="space-y-2 mb-6">
        <Typography className="text-2xl font-semibold text-on-banner-text">
          Editar Experiência
        </Typography>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          <FormField
            control={form.control}
            name="experienceImages"
            render={() => (
              <FormItem>
                <Typography className="font-medium text-foreground text-lg">
                  Imagens da Experiência
                </Typography>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="edit-image-upload"
                  />
                  {previews.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {previews.map((preview, index) => (
                        <div
                          key={preview}
                          className="relative aspect-[2/1] overflow-hidden rounded-lg border"
                        >
                          <img
                            src={preview}
                            alt={`Imagem ${index + 1} da experiência`}
                            className="h-full w-full object-cover"
                          />
                          {index === 0 && (
                            <span className="absolute left-2 top-2 rounded-full bg-main-dark-green px-2 py-0.5 text-[11px] font-semibold text-white">
                              Capa
                            </span>
                          )}
                          <button
                            type="button"
                            aria-label={`Remover imagem ${index + 1}`}
                            onClick={() => handleRemoveImage(index)}
                            className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {previews.length < MAX_IMAGES && (
                        <label
                          htmlFor="edit-image-upload"
                          className="flex aspect-[2/1] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 text-muted-foreground transition-colors hover:border-contrast-green hover:text-contrast-green"
                        >
                          <ImagePlus className="h-8 w-8" />
                          <Typography className="text-sm font-medium">Adicionar imagens</Typography>
                        </label>
                      )}
                    </div>
                  ) : (
                    <label
                      htmlFor="edit-image-upload"
                      className="cursor-pointer flex flex-col items-center gap-4"
                    >
                      <Upload className="h-12 w-12 text-contrast-green" />
                      <Typography className="text-lg font-medium text-foreground">
                        SELECIONE UMA OU MAIS IMAGENS
                      </Typography>
                    </label>
                  )}
                  <Modal
                    open={cropSource !== null}
                    onOpenChange={(open) => {
                      if (!open) handleCropSkip();
                    }}
                    title="Cortar imagem"
                  >
                    <div style={{ position: "relative", width: 400, height: 200, background: "#333" }}>
                      {cropSource && (
                        <Cropper
                          image={cropSource}
                          crop={crop}
                          zoom={zoom}
                          aspect={2}
                          cropShape="rect"
                          showGrid={true}
                          onCropChange={setCrop}
                          onZoomChange={setZoom}
                          onCropComplete={onCropComplete}
                        />
                      )}
                    </div>
                    {pendingFiles.length > 0 && (
                      <Typography className="mt-2 text-sm text-muted-foreground">
                        {pendingFiles.length} imagem(ns) aguardando corte
                      </Typography>
                    )}
                    <div className="flex gap-4 mt-4 justify-end">
                      <Button type="button" label="Descartar imagem" onClick={handleCropSkip} />
                      <Button
                        type="button"
                        label="Salvar corte"
                        onClick={() => void handleCropSave()}
                      />
                    </div>
                  </Modal>
                  <Typography className="text-sm text-muted-foreground mt-2">
                    Até {MAX_IMAGES} imagens, cortadas para 400x200 nos formatos .PNG, .JPG e .JPEG.
                    A primeira é a capa e as demais se alternam no card da experiência.
                  </Typography>
                </div>
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
          />

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="experienceName"
              render={({ field }) => (
                <FormItem>
                  <TextInput
                    label="Nome da experiência"
                    required
                    placeholder="Digite o nome da experiência"
                    {...field}
                  />
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="experienceCategory"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-col gap-0">
                    <Typography className="text-foreground font-medium">
                      Tipo de experiência *
                    </Typography>
                    <Select
                      key={field.value}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo">
                          {field.value && (
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(field.value)}
                              <Typography>
                                {EXPERIENCE_CATEGORY_FORM_LABEL[field.value]}
                              </Typography>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ExperienceCategory).map((category) => (
                          <SelectItem key={category} value={category}>
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(category)}
                              {EXPERIENCE_CATEGORY_FORM_LABEL[category]}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-0">
              <Typography className="text-foreground font-medium mb-1">
                Quantidade de pessoas *
              </Typography>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="experienceMinCapacity"
                  render={({ field }) => (
                    <FormItem>
                      <TextInput
                        label="Mínimo"
                        type="number"
                        min="1"
                        placeholder="Ex: 1"
                        {...field}
                      />
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="experienceCapacity"
                  render={({ field }) => (
                    <FormItem>
                      <TextInput
                        label="Máximo"
                        type="number"
                        min="1"
                        placeholder="Ex: 38"
                        {...field}
                      />
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="experienceWeekDays"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-col gap-0">
                    <Typography className="text-foreground font-medium">
                      Dias da semana disponíveis
                    </Typography>
                    <Popover>
                      <PopoverTrigger asChild>
                        <ShadcnButton
                          variant="outline"
                          className="w-full justify-start text-left font-normal h-12 px-5"
                        >
                          {field.value && field.value.length > 0 ? (
                            <Typography className="text-sm">
                              {field.value.length} dia(s) selecionado(s)
                            </Typography>
                          ) : (
                            <Typography className="text-sm text-muted-foreground">
                              Selecione os dias da semana
                            </Typography>
                          )}
                        </ShadcnButton>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <div className="p-4 space-y-2">
                          {WEEK_DAYS.map((day) => (
                            <div key={day.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={day.value}
                                checked={field.value?.includes(day.value) || false}
                                onCheckedChange={(checked) => {
                                  const currentDays = field.value || [];

                                  if (checked) {
                                    field.onChange([...currentDays, day.value]);
                                  } else {
                                    field.onChange(currentDays.filter((d) => d !== day.value));
                                  }
                                }}
                              />
                              <Label
                                htmlFor={day.value}
                                className="text-sm cursor-pointer font-normal"
                              >
                                {day.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="experienceDescription"
            render={({ field }) => (
              <FormItem>
                <Typography className="text-foreground font-medium">
                  Descrição da experiência
                </Typography>
                <MarkdownTextArea
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Descreva a experiência..."
                />
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="experienceStartDate"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-col gap-0">
                    <Typography className="text-foreground font-medium">Data de início</Typography>
                    <Popover>
                      <PopoverTrigger asChild>
                        <ShadcnButton
                          variant="outline"
                          className="w-full justify-start text-left font-normal h-12"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(
                              field.value instanceof Date ? field.value : new Date(field.value),
                              "dd/MM/yyyy",
                              {
                                locale: ptBR,
                              },
                            )
                          ) : (
                            <Typography>Selecione a data</Typography>
                          )}
                        </ShadcnButton>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={
                            field.value instanceof Date
                              ? field.value
                              : field.value
                                ? new Date(field.value)
                                : undefined
                          }
                          onSelect={field.onChange}
                          disabled={getDisabledDates(true)}
                          autoFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="experienceEndDate"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-col gap-0">
                    <Typography className="text-foreground font-medium">Data de fim</Typography>
                    <Popover>
                      <PopoverTrigger asChild>
                        <ShadcnButton
                          variant="outline"
                          className="w-full justify-start text-left font-normal h-12"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(
                              field.value instanceof Date ? field.value : new Date(field.value),
                              "dd/MM/yyyy",
                              {
                                locale: ptBR,
                              },
                            )
                          ) : (
                            <Typography>Selecione a data</Typography>
                          )}
                        </ShadcnButton>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={
                            field.value instanceof Date
                              ? field.value
                              : field.value
                                ? new Date(field.value)
                                : undefined
                          }
                          onSelect={field.onChange}
                          disabled={getDisabledDates(false)}
                          autoFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="experiencePrice"
              render={({ field }) => (
                <FormItem>
                  <TextInput
                    label="Preço R$ (Por Pessoa)"
                    placeholder="0,00"
                    value={priceDisplay}
                    onChange={(e) => {
                      const formatted = formatPrice(e.target.value);

                      setPriceDisplay(formatted);
                      field.onChange(String(parsePrice(formatted) / 100));
                    }}
                  />
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />
          </div>

          {watchedCategory === ExperienceCategory.TRILHA && (
            <div className="space-y-4">
              <Separator />
              <Typography className="font-medium text-foreground text-lg">
                Informações da Trilha
              </Typography>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="trailDurationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <TextInput
                        label="Duração (minutos)"
                        required
                        type="number"
                        min="1"
                        placeholder="Ex: 120"
                        {...field}
                      />
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trailDifficulty"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-col gap-0">
                        <Typography className="text-foreground font-medium mb-1">
                          Dificuldade *
                        </Typography>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a dificuldade" />
                          </SelectTrigger>
                          <SelectContent>
                            {DIFFICULTY_LEVELS.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trailLength"
                  render={({ field }) => (
                    <FormItem>
                      <TextInput label="Distância (km)" required placeholder="Ex: 5.2" {...field} />
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              label="Cancelar"
              className="w-36"
              onClick={() => navigate({ to: "/admin/experiences" })}
            />
            <Button
              type="submit"
              variant="primary"
              className="w-36"
              onClick={onSubmit}
              label="Salvar"
            />
          </div>
        </form>
      </Form>
    </div>
  );
}
