"use server";

import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { Transaction } from "@/models/Transaction";
import {
  createCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@/lib/schemas/category";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const deleteCategorySchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid category ID."),
});

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === 11000
  );
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return { ok: false, error: "Please sign in to continue." };

  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };

  try {
    await connectDB();
    const doc = await Category.create({
      ...parsed.data,
      userId: session.user.id,
      isDefault: false,
    });
    revalidatePath("/app/categories");
    revalidatePath("/app/transactions");
    return { ok: true, data: { id: String(doc._id) } };
  } catch (err) {
    if (isDuplicateKeyError(err))
      return { ok: false, error: "A category with this name already exists." };
    return { ok: false, error: "Failed to create category. Please try again." };
  }
}

export async function updateCategory(
  input: UpdateCategoryInput,
): Promise<ActionResult<void>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return { ok: false, error: "Please sign in to continue." };

  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };

  try {
    await connectDB();
    const { id, ...fields } = parsed.data;
    const updated = await Category.findOneAndUpdate(
      { _id: id, userId: session.user.id, isDefault: false },
      { $set: fields },
      { new: true },
    );
    if (!updated)
      return { ok: false, error: "Category not found or cannot be edited." };
    revalidatePath("/app/categories");
    revalidatePath("/app/transactions");
    return { ok: true, data: undefined };
  } catch (err) {
    if (isDuplicateKeyError(err))
      return { ok: false, error: "A category with this name already exists." };
    return { ok: false, error: "Failed to update category. Please try again." };
  }
}

export async function deleteCategory(
  input: { id: string },
): Promise<ActionResult<{ deletedTransactions: number }>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return { ok: false, error: "Please sign in to continue." };

  const parsed = deleteCategorySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };

  try {
    await connectDB();

    // Verify the category exists and belongs to this user, and is not a default
    const category = await Category.findOne({
      _id: parsed.data.id,
      userId: session.user.id,
      isDefault: false,
    });
    if (!category)
      return { ok: false, error: "Category not found or cannot be deleted." };

    // Delete all transactions linked to this category first
    const { deletedCount } = await Transaction.deleteMany({
      categoryId: category._id,
      userId: session.user.id,
    });

    // Delete the category itself
    await Category.deleteOne({ _id: category._id });

    revalidatePath("/app/categories");
    revalidatePath("/app/transactions");
    revalidatePath("/app/dashboard");
    return { ok: true, data: { deletedTransactions: deletedCount } };
  } catch {
    return { ok: false, error: "Failed to delete category. Please try again." };
  }
}
