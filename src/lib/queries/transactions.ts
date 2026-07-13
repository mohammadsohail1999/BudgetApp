import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Transaction as TransactionModel } from "@/models/Transaction";
import type { Transaction } from "@/types";
import { getServerSession } from "next-auth";

export interface TransactionFilters {
  type?: "income" | "expense";
  categoryId?: string;
  search?: string;
  page: number;
  limit: number;
}

export async function getTransactions(filters: TransactionFilters): Promise<{
  transactions: Transaction[];
  total: number;
}> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { transactions: [], total: 0 };

  try {
    await connectDB();

    const query: Record<string, unknown> = { userId: session.user.id };
    if (filters.type) query.type = filters.type;
    if (filters.categoryId) query.categoryId = filters.categoryId;
    if (filters.search?.trim()) {
      query.description = { $regex: filters.search.trim(), $options: "i" };
    }

    const skip = (filters.page - 1) * filters.limit;

    const [docs, total] = await Promise.all([
      TransactionModel.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(filters.limit)
        .select("-__v")
        .lean(),
      TransactionModel.countDocuments(query),
    ]);

    return {
      transactions: docs.map((doc) => ({
        id: String(doc._id),
        userId: String(doc.userId),
        type: doc.type,
        amount: doc.amount,
        categoryId: String(doc.categoryId),
        description: doc.description,
        date: (doc.date as unknown as Date).toISOString().slice(0, 10),
        createdAt: (doc.createdAt as unknown as Date).toISOString(),
        updatedAt: (doc.updatedAt as unknown as Date).toISOString(),
      })),
      total,
    };
  } catch {
    return { transactions: [], total: 0 };
  }
}
