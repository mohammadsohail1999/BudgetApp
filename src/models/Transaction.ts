import mongoose, {
  Schema,
  model,
  models,
  type Document,
  type Types,
} from "mongoose";

export interface ITransaction extends Document {
  userId: Types.ObjectId;
  type: "income" | "expense";
  amount: number; // stored in cents (integer) — e.g. $12.50 → 1250
  categoryId: Types.ObjectId;
  description?: string;
  date: Date; // actual transaction date — user can backdate
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: [true, "Transaction type is required."],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required."],
      min: [1, "Amount must be at least 1 cent."],
      validate: {
        validator: Number.isInteger,
        message: "Amount must be an integer (value in cents).",
      },
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required."],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, "Description must be 300 characters or fewer."],
    },
    date: {
      type: Date,
      required: [true, "Transaction date is required."],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Pattern 1 — no filters, full list newest first
TransactionSchema.index({ userId: 1, date: -1 });

// Pattern 2 — type filter only (e.g. "show all expenses")
TransactionSchema.index({ userId: 1, type: 1, date: -1 });

// Pattern 3 & 4 — category filter only OR category + type filter
// Left-to-right prefix: (userId+categoryId) covers category-only queries;
// full index (userId+categoryId+type+date) covers category+type queries.
TransactionSchema.index({ userId: 1, categoryId: 1, type: 1, date: -1 });

export const Transaction =
  (models.Transaction as mongoose.Model<ITransaction>) ??
  model<ITransaction>("Transaction", TransactionSchema);
