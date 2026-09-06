import type { UserType } from "@/types/user";

export const USER_TYPE_LABEL: Record<UserType, string> = {
  ADMIN: "Administrador",
  ROOT: "Super Admin",
  PROFESSOR: "Professor",
  GUEST: "Convidado",
};

export const USER_TYPE_OPTIONS = Object.entries(USER_TYPE_LABEL).map(
  ([value, label]) => ({ value: value as UserType, label })
);
