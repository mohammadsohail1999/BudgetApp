import mongoose, {
  Schema,
  model,
  models,
  type Document,
  type Types,
} from "mongoose";

export interface IMonthlyBudget extends Document {
  userId: Types.ObjectId;
  categoryId: Types.ObjectId;
  year: number; // e.g. 2026
  month: number; // 1–12
  limitAmount: number; // spending cap in cents
  createdAt: Date;
  updatedAt: Date;
}

const MonthlyBudgetSchema = new Schema<IMonthlyBudget>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required."],
    },
    year: {
      type: Number,
      required: [true, "Year is required."],
      min: [2000, "Year must be 2000 or later."],
      max: [2100, "Year must be 2100 or earlier."],
    },
    month: {
      type: Number,
      required: [true, "Month is required."],
      min: [1, "Month must be between 1 and 12."],
      max: [12, "Month must be between 1 and 12."],
    },
    limitAmount: {
      type: Number,
      required: [true, "Budget limit is required."],
      min: [1, "Budget limit must be at least 1 cent."],
      validate: {
        validator: Number.isInteger,
        message: "Limit amount must be an integer (value in cents).",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// One budget per category per month per user
MonthlyBudgetSchema.index(
  { userId: 1, categoryId: 1, year: 1, month: 1 },
  { unique: true },
);

// Fetch all budgets for a user in a given month
MonthlyBudgetSchema.index({ userId: 1, year: 1, month: 1 });

export const MonthlyBudget =
  (models.MonthlyBudget as mongoose.Model<IMonthlyBudget>) ??
  model<IMonthlyBudget>("MonthlyBudget", MonthlyBudgetSchema);
