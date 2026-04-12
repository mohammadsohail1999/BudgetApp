import mongoose, {
  Schema,
  model,
  models,
  type Document,
  type Types,
} from "mongoose";

export interface ICategory extends Document {
  userId: Types.ObjectId;
  name: string;
  type: "income" | "expense" | "both";
  color: string; // hex e.g. "#6366f1"
  icon: string; // slug e.g. "shopping-cart"
  isDefault: boolean; // seeded at signup — protected from deletion
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Category name is required."],
      trim: true,
      maxlength: [50, "Category name must be 50 characters or fewer."],
    },
    type: {
      type: String,
      enum: ["income", "expense", "both"],
      required: [true, "Category type is required."],
    },
    color: {
      type: String,
      required: [true, "Color is required."],
      match: [/^#[0-9A-Fa-f]{6}$/, "Color must be a valid 6-digit hex code."],
    },
    icon: {
      type: String,
      required: [true, "Icon is required."],
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// One category name per user — user2 can have the same name as user1 (no collision)
CategorySchema.index({ userId: 1, name: 1 }, { unique: true });

export const Category =
  (models.Category as mongoose.Model<ICategory>) ??
  model<ICategory>("Category", CategorySchema);
