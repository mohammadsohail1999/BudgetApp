/**
 * Shared TypeScript types for the Budget App.
 * Keep domain types here; keep Mongoose document interfaces co-located with their models.
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
// Transactions (budget data)
// ---------------------------------------------------------------------------

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number; // stored in cents (integer) to avoid float precision issues
  category: string;
  description?: string;
  date: string; // ISO date string (YYYY-MM-DD)
  createdAt: string;
  updatedAt: string;
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
