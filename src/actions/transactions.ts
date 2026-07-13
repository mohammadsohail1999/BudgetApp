"use server";

import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import {
  transactionFormSchema,
  updateTransactionSchema,
  type TransactionFormInput,
  type UpdateTransactionInput,
} from "@/lib/schemas/transaction";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const deleteTransactionSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid transaction ID."),
});

export async function createTransaction(
  input: TransactionFormInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: "Please sign in to continue." };

  const parsed = transactionFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  try {
    await connectDB();
    const tx = await Transaction.create({
      userId: session.user.id,
      type: parsed.data.type,
      amount: Math.round(parsed.data.amount * 100), // rupees → paise
      categoryId: parsed.data.categoryId,
      description: parsed.data.description,
      date: new Date(parsed.data.date),
    });

    revalidatePath("/app/transactions");
    return { ok: true, data: { id: String(tx._id) } };
  } catch {
    return { ok: false, error: "Failed to create transaction. Please try again." };
  }
}

export async function updateTransaction(
  input: UpdateTransactionInput,
): Promise<ActionResult<void>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: "Please sign in to continue." };

  const parsed = updateTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  try {
    await connectDB();

    const updateData: Record<string, unknown> = {};
    if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
    if (parsed.data.amount !== undefined)
      updateData.amount = Math.round(parsed.data.amount * 100); // rupees → paise
    if (parsed.data.categoryId !== undefined)
      updateData.categoryId = parsed.data.categoryId;
    if (parsed.data.description !== undefined)
      updateData.description = parsed.data.description || undefined;
    if (parsed.data.date !== undefined)
      updateData.date = new Date(parsed.data.date);

    const updated = await Transaction.findOneAndUpdate(
      { _id: parsed.data.id, userId: session.user.id },
      { $set: updateData },
      { new: true },
    );

    if (!updated) return { ok: false, error: "Transaction not found." };

    revalidatePath("/app/transactions");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Failed to update transaction. Please try again." };
  }
}

export async function deleteTransaction(
  input: { id: string },
): Promise<ActionResult<void>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: "Please sign in to continue." };

  const parsed = deleteTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  try {
    await connectDB();

    const deleted = await Transaction.findOneAndDelete({
      _id: parsed.data.id,
      userId: session.user.id,
    });

    if (!deleted) return { ok: false, error: "Transaction not found." };

    revalidatePath("/app/transactions");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Failed to delete transaction. Please try again." };
  }
}
