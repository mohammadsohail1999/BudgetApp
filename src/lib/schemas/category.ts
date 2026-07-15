import { z } from "zod";

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required.")
    .max(50, "Name must be 50 characters or fewer."),
  type: z.enum(["income", "expense", "both"], {
    error: "Type is required.",
  }),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color."),
  icon: z.string().min(1, "Icon is required."),
});

export const updateCategorySchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid category ID."),
  name: z
    .string()
    .min(1, "Name is required.")
    .max(50, "Name must be 50 characters or fewer.")
    .optional(),
  type: z.enum(["income", "expense", "both"]).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color.")
    .optional(),
  icon: z.string().min(1, "Icon is required.").optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
