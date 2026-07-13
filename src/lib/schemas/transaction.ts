import { z } from "zod";

export const transactionFormSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive("Amount must be greater than 0."),
  categoryId: z
    .string()
    .min(1, "Category is required.")
    .regex(/^[a-f\d]{24}$/i, "Invalid category."),
  description: z
    .string()
    .max(300, "Description must be 300 characters or fewer.")
    .optional(),
  date: z
    .string()
    .min(1, "Date is required.")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date."),
});

export type TransactionFormInput = z.infer<typeof transactionFormSchema>;

export const updateTransactionSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid transaction ID."),
  type: z.enum(["income", "expense"]).optional(),
  amount: z.number().positive("Amount must be greater than 0.").optional(),
  categoryId: z
    .string()
    .min(1, "Category is required.")
    .regex(/^[a-f\d]{24}$/i, "Invalid category.")
    .optional(),
  description: z
    .string()
    .max(300, "Description must be 300 characters or fewer.")
    .optional(),
  date: z
    .string()
    .min(1, "Date is required.")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date.")
    .optional(),
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export function zodFieldErrors(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!map[key]) map[key] = issue.message;
  }
  return map;
}
