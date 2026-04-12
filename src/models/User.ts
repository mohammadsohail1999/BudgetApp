import mongoose, { Schema, model, models, type Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string; // bcrypt hash — never expose in API responses
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      maxlength: [100, "Name must be 100 characters or fewer."],
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address."],
    },
    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: [8, "Password must be at least 8 characters."],
      select: false, // excluded from query results by default
    },
  },
  {
    timestamps: true, // createdAt + updatedAt
    versionKey: false, // no __v field
  },
);

/**
 * Use `models.User` if already compiled (dev hot-reload safety),
 * otherwise compile a fresh model. This is the standard Next.js + Mongoose pattern.
 */
export const User =
  (models.User as mongoose.Model<IUser>) ?? model<IUser>("User", UserSchema);
