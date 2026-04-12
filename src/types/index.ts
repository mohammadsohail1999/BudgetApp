/**
 * Shared TypeScript types for the Budget App.
 * Mongoose document interfaces live co-located with their models.
 * Only plain client-facing shapes belong here.
 */

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** Safe user shape returned to the client — never includes password. */
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  createdAt: string; // ISO string (Date serialized via JSON)
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type CategoryType = "income" | "expense" | "both";

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  color: string; // hex e.g. "#6366f1"
  icon: string; // slug e.g. "shopping-cart"
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number; // cents (integer) — e.g. $12.50 → 1250
  categoryId: string;
  description?: string;
  date: string; // ISO date string (YYYY-MM-DD)
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Monthly Budgets
// ---------------------------------------------------------------------------

export interface MonthlyBudget {
  id: string;
  userId: string;
  categoryId: string;
  year: number;
  month: number; // 1–12
  limitAmount: number; // cents
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Dashboard aggregation result shapes (computed, not stored)
// ---------------------------------------------------------------------------

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string;
  total: number; // cents
  percentage: number; // 0–100
}

export interface MonthlySummary {
  year: number;
  month: number; // 1–12
  totalIncome: number; // cents
  totalExpenses: number; // cents
  net: number; // totalIncome - totalExpenses
  byCategory: CategorySpending[];
}

// ---------------------------------------------------------------------------
// API response envelope
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
