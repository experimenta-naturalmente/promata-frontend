import z from "zod";

export const EditUserAdminResponse = z
  .object({
    name: z.string().max(100).optional().nullable(),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    document: z.string().optional().nullable(),
    rg: z.string().optional().nullable(),
    gender: z.string().optional().nullable(),
    zipCode: z.string().optional().nullable(),
    userType: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    addressLine: z.string().optional().nullable(),
    number: z.number().optional().nullable(),
    institution: z.string().optional().nullable(),
    isForeign: z.boolean().optional().nullable(),
    isAdmin: z.boolean().optional().nullable(),
  })
  .transform((data) => ({
    ...data,
    isAdmin: data.userType === "ADMIN" || data.userType === "ROOT",
    isProfessor: data.userType === "PROFESSOR",
  }));

export type TEditUserAdminResponse = z.infer<typeof EditUserAdminResponse>;
