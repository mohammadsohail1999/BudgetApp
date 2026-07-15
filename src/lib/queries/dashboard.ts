import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import type {
  CategorySpending,
  MonthlyTrendItem,
  MonthlySummary,
  RecentTransaction,
} from "@/types";
import { Types } from "mongoose";
import { getServerSession } from "next-auth";

// ---------------------------------------------------------------------------
// getMonthlySummary
// ---------------------------------------------------------------------------

export async function getMonthlySummary(
  year: number,
  month: number,
): Promise<MonthlySummary> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return emptyMonthlySummary(year, month);

  try {
    await connectDB();
    const userId = new Types.ObjectId(session.user.id);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    type TypeTotal = { _id: "income" | "expense"; total: number; count: number };
    type CatTotal = {
      _id: Types.ObjectId;
      total: number;
      category: { name: string; color: string; icon: string };
    };

    const [typeTotals, categoryTotals] = await Promise.all([
      Transaction.aggregate<TypeTotal>([
        { $match: { userId, date: { $gte: monthStart, $lt: monthEnd } } },
        { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      Transaction.aggregate<CatTotal>([
        { $match: { userId, type: "expense", date: { $gte: monthStart, $lt: monthEnd } } },
        { $group: { _id: "$categoryId", total: { $sum: "$amount" } } },
        { $sort: { total: -1 } },
        { $limit: 8 },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
      ]),
    ]);

    const totalIncome = typeTotals.find((t) => t._id === "income")?.total ?? 0;
    const totalExpenses = typeTotals.find((t) => t._id === "expense")?.total ?? 0;
    const transactionCount = typeTotals.reduce((sum, t) => sum + t.count, 0);
    const net = totalIncome - totalExpenses;

    const byCategory: CategorySpending[] = categoryTotals.map((ct) => ({
      categoryId: String(ct._id),
      categoryName: ct.category.name,
      color: ct.category.color,
      icon: ct.category.icon,
      total: ct.total,
      percentage:
        totalExpenses > 0 ? Math.round((ct.total / totalExpenses) * 100) : 0,
    }));

    return { year, month, totalIncome, totalExpenses, net, transactionCount, byCategory };
  } catch {
    return emptyMonthlySummary(year, month);
  }
}

function emptyMonthlySummary(year: number, month: number): MonthlySummary {
  return {
    year,
    month,
    totalIncome: 0,
    totalExpenses: 0,
    net: 0,
    transactionCount: 0,
    byCategory: [],
  };
}

// ---------------------------------------------------------------------------
// getMonthlyTrend
// ---------------------------------------------------------------------------

export async function getMonthlyTrend(nMonths = 6): Promise<MonthlyTrendItem[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];

  try {
    await connectDB();
    const userId = new Types.ObjectId(session.user.id);
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - (nMonths - 1), 1);

    type RawRow = {
      _id: { year: number; month: number; type: "income" | "expense" };
      total: number;
    };

    const raw = await Transaction.aggregate<RawRow>([
      { $match: { userId, date: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            type: "$type",
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const map = new Map<string, { totalIncome: number; totalExpenses: number }>();
    for (const row of raw) {
      const key = `${row._id.year}-${row._id.month}`;
      if (!map.has(key)) map.set(key, { totalIncome: 0, totalExpenses: 0 });
      const entry = map.get(key)!;
      if (row._id.type === "income") entry.totalIncome = row.total;
      else entry.totalExpenses = row.total;
    }

    const result: MonthlyTrendItem[] = [];
    for (let i = 0; i < nMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (nMonths - 1 - i), 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const entry = map.get(`${y}-${m}`) ?? { totalIncome: 0, totalExpenses: 0 };
      result.push({
        year: y,
        month: m,
        totalIncome: entry.totalIncome,
        totalExpenses: entry.totalExpenses,
        net: entry.totalIncome - entry.totalExpenses,
      });
    }

    return result;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// getRecentTransactions
// ---------------------------------------------------------------------------

export async function getRecentTransactions(limit = 5): Promise<RecentTransaction[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];

  try {
    await connectDB();
    const userId = new Types.ObjectId(session.user.id);

    type RawDoc = {
      _id: Types.ObjectId;
      type: "income" | "expense";
      amount: number;
      description?: string;
      date: Date;
      category: { name: string; color: string; icon: string } | null;
    };

    const docs = await Transaction.aggregate<RawDoc>([
      { $match: { userId } },
      { $sort: { date: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    ]);

    return docs.map((doc) => ({
      id: String(doc._id),
      type: doc.type,
      amount: doc.amount,
      description: doc.description,
      date: doc.date.toISOString().slice(0, 10),
      categoryName: doc.category?.name ?? "Uncategorized",
      categoryColor: doc.category?.color ?? "#9ca3af",
      categoryIcon: doc.category?.icon ?? "category",
    }));
  } catch {
    return [];
  }
}
