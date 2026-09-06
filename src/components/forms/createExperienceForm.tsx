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
import type { CreateExperiencePayload } from "@/api/experience";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ExperienceCategory } from "@/types/experience";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bed,
  Building2,
  Calendar,
  CalendarIcon,
  FlaskConical,
  ImagePlus,
  Mountain,
  Upload,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import Modal from "@/components/ui/modal";
import getCroppedImg from "@/utils/cropImage";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useCreateExperience } from "@/hooks";
import { MarkdownTextArea } from "@/components/text-areas";

const MAX_IMAGES = 10;

const formSchema = z
  .object({
    experienceName: z.string().min(2, "Informe o nome da experiência"),
    experienceDescription: z.string().min(2, "Informe a descrição da experiência"),
    experienceCategory: z.nativeEnum(ExperienceCategory),
    experienceMinCapacity: z.coerce.number().min(1, "Informe a quantidade mínima de pessoas"),
    experienceCapacity: z.coerce.number().min(1, "Informe a quantidade máxima de pessoas"),
    experienceImages: z
      .array(z.instanceof(File))
      .min(1, "Selecione ao menos uma imagem para a experiência")
      .max(MAX_IMAGES, `Selecione no máximo ${MAX_IMAGES} imagens`),
    experienceStartDate: z.date().optional(),
    experienceEndDate: z.date().optional(),
    experiencePrice: z.coerce.number().optional(),
    experienceWeekDays: z.array(z.string()).optional().default([]),
    trailDurationMinutes: z.coerce.number().optional(),
    trailDifficulty: z.string().optional(),
    trailLength: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.experienceEndDate &&
      data.experienceStartDate &&
      data.experienceEndDate < data.experienceStartDate
    ) {
      ctx.addIssue({
        code: "custom",
        message: "A data de fim deve ser posterior à data de início",
        path: ["experienceEndDate"],
      });
    }
    if (data.experienceMinCapacity > data.experienceCapacity) {
      ctx.addIssue({
        code: "custom",
        message: "A quantidade máxima deve ser maior ou igual à mínima",
        path: ["experienceCapacity"],
      });
    }
    if (data.experienceCategory === ExperienceCategory.TRILHA) {
      const hasValidMinutes = !!data.trailDurationMinutes && data.trailDurationMinutes > 0;

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
    case ExperienceCategory.EVENTO:
      return <Calendar className="h-4 w-4" />;
    default:
      return <Building2 className="h-4 w-4" />;
  }
};

const formatPrice = (value: string) => {
  const numbers = value.replace(/\D/g, "");

  if (!numbers) {
    return "";
  }
  const cents = parseInt(numbers, 10) || 0;

  return (cents / 100).toFixed(2).replace(".", ",");
};

const parsePrice = (formattedValue: string) => {
  const numbers = formattedValue.replace(/\D/g, "");

  if (!numbers) {
    return undefined;
  }
  const cents = parseInt(numbers, 10) || 0;

  return cents / 100;
};

export function CreateExperience() {
  const { mutate } = useCreateExperience();
  // Cada arquivo escolhido passa pelo corte antes de entrar na galeria, um por vez.
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const previewsRef = useRef<string[]>([]);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [priceDisplay, setPriceDisplay] = useState<string>("");
  const navigate = useNavigate();

  const form = useForm<z.input<typeof formSchema>, unknown, z.output<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      experienceName: "",
      experienceDescription: "",
      experienceCategory: ExperienceCategory.LABORATORIO,
      experienceMinCapacity: 1,
      experienceCapacity: 1,
      experienceImages: [],
      experienceStartDate: undefined,
      experienceEndDate: undefined,
      experiencePrice: undefined,
      experienceWeekDays: [],
      trailDurationMinutes: undefined,
      trailDifficulty: undefined,
      trailLength: undefined,
    },
  });

  const watchedCategory = form.watch("experienceCategory");
  const watchedStartDate = form.watch("experienceStartDate");
  const watchedEndDate = form.watch("experienceEndDate");
  const watchedPrice = form.watch("experiencePrice");

  useEffect(() => {
    if (watchedStartDate && watchedEndDate && watchedEndDate < watchedStartDate) {
      form.setValue("experienceEndDate", undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedStartDate, watchedEndDate]);

  useEffect(() => {
    if (typeof watchedPrice !== "number" || Number.isNaN(watchedPrice)) {
      setPriceDisplay("");

      return;
    }

    setPriceDisplay(
      watchedPrice.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    );
  }, [watchedPrice]);

  const getDisabledDates = (isStartDate: boolean) => {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    if (isStartDate) {
      return { before: today };
    } else {
      const startDate = watchedStartDate;

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
      previewsRef.current.forEach((preview) => URL.revokeObjectURL(preview));
    },
    [],
  );

  // Puxa o próximo arquivo da fila assim que o corte anterior é resolvido.
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

    // Permite reescolher o mesmo arquivo depois de removê-lo da galeria.
    e.target.value = "";

    if (files.length === 0) {
      return;
    }

    const images = files.filter((file) => file.type.startsWith("image/"));

    if (images.length < files.length) {
      appToast.error("Por favor, selecione apenas arquivos de imagem.");
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
      URL.revokeObjectURL(current[index]);

      return current.filter((_, position) => position !== index);
    });
  };

  const submitForm = form.handleSubmit((data) => {
    const payload: CreateExperiencePayload = {
      ...data,
      experienceWeekDays: (data.experienceWeekDays ?? []).map((day) => day.toUpperCase()),
    };

    mutate(payload, {
      onSuccess: (response) => {
        toastApiSuccess(response?.data, "Experiência criada com sucesso");
        navigate({ to: "/admin/experiences" });
      },
      onError: (error) => {
        toastApiError(error, "Erro ao criar experiência");
      },
    });
  });

  const handleFormSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    submitForm(event);
  };

  return (
    <div className="pb-8 pt-6 justify-items-center">
      <div className="space-y-2 mb-6">
        <Typography className="text-2xl font-semibold text-on-banner-text">
          Criar Experiência
        </Typography>
      </div>

      <Form {...form}>
        <form className="space-y-6" onSubmit={handleFormSubmit}>
          <FormField
            control={form.control}
            name="experienceImages"
            render={() => (
              <FormItem>
                <Typography className="font-medium text-foreground text-lg">
                  Imagens da Experiência *
                </Typography>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  {previews.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {previews.map((preview, index) => (
                        <div
                          key={preview}
                          className="group relative aspect-[2/1] overflow-hidden rounded-lg border"
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
                          htmlFor="image-upload"
                          className="flex aspect-[2/1] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 text-muted-foreground transition-colors hover:border-contrast-green hover:text-contrast-green"
                        >
                          <ImagePlus className="h-8 w-8" />
                          <Typography className="text-sm font-medium">Adicionar imagem</Typography>
                        </label>
                      )}
                    </div>
                  ) : (
                    <label
                      htmlFor="image-upload"
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
                    Até {MAX_IMAGES} imagens, cortadas e redimensionadas automaticamente para
                    400x200, nos formatos .PNG, .JPG e .JPEG. A primeira é a capa e as demais se
                    alternam no card da experiência.
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo">
                          {field.value && (
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(field.value)}
                              <Typography>
                                {field.value === ExperienceCategory.LABORATORIO && "Laboratório"}
                                {field.value === ExperienceCategory.TRILHA && "Trilha"}
                                {field.value === ExperienceCategory.HOSPEDAGEM && "Hospedagem"}
                                {field.value === ExperienceCategory.EVENTO && "Evento"}
                              </Typography>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ExperienceCategory.LABORATORIO}>
                          <div className="flex items-center gap-2">
                            <FlaskConical className="h-4 w-4" />
                            Laboratório
                          </div>
                        </SelectItem>
                        <SelectItem value={ExperienceCategory.TRILHA}>
                          <div className="flex items-center gap-2">
                            <Mountain className="h-4 w-4" />
                            Trilha
                          </div>
                        </SelectItem>
                        <SelectItem value={ExperienceCategory.HOSPEDAGEM}>
                          <div className="flex items-center gap-2">
                            <Bed className="h-4 w-4" />
                            Hospedagem
                          </div>
                        </SelectItem>
                        <SelectItem value={ExperienceCategory.EVENTO}>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Evento
                          </div>
                        </SelectItem>
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
                        value={field.value as number | undefined}
                        onChange={(e) =>
                          field.onChange(
                            e.currentTarget.value === ""
                              ? undefined
                              : Number(e.currentTarget.value),
                          )
                        }
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
                        value={field.value as number | undefined}
                        onChange={(e) =>
                          field.onChange(
                            e.currentTarget.value === ""
                              ? undefined
                              : Number(e.currentTarget.value),
                          )
                        }
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
                <Typography className="text-foreground font-medium mb-2">
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
                            format(field.value, "dd/MM/yyyy", {
                              locale: ptBR,
                            })
                          ) : (
                            <Typography>Selecione a data</Typography>
                          )}
                        </ShadcnButton>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
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
                            format(field.value, "dd/MM/yyyy", {
                              locale: ptBR,
                            })
                          ) : (
                            <Typography>Selecione a data</Typography>
                          )}
                        </ShadcnButton>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
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
                    label="Preço R$ (Por pessoa)"
                    placeholder="0,00"
                    value={priceDisplay}
                    onChange={(e) => {
                      const formatted = formatPrice(e.target.value);

                      setPriceDisplay(formatted);
                      field.onChange(parsePrice(formatted));
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
                        value={field.value as number | undefined}
                        onChange={(e) =>
                          field.onChange(
                            e.currentTarget.value === ""
                              ? undefined
                              : Number(e.currentTarget.value),
                          )
                        }
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
                        <Typography className="text-foreground font-medium">
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
              label="Voltar"
              className="w-36"
              onClick={() => history.back()}
            />
            <Button type="submit" variant="primary" className="w-36" label="Criar" />
          </div>
        </form>
      </Form>
    </div>
  );
}