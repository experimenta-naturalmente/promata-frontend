import z from "zod";
import { ApiDefaultFilters } from "./api-default-filters";

export const UserAdminRequestFilters = z.object({
  ...ApiDefaultFilters.shape,
  name: z.string().max(100).optional(),
  email: z.string().optional(),
  createdBy: z.string().max(100).optional(),
  userType: z.enum(["ADMIN", "ROOT", "GUEST", "PROFESSOR"]).optional(),
});

export type TUserAdminRequestFilters = z.infer<typeof UserAdminRequestFilters>;
