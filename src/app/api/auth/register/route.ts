import { connectDB } from "@/lib/db";
import { DEFAULT_CATEGORIES } from "@/lib/defaultCategories";
import { Category } from "@/models/Category";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const registerSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required.")
    .max(100, "Name must be 100 characters or fewer."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  await connectDB();

  const exists = await User.findOne({ email: parsed.data.email }).lean();
  if (exists) {
    return NextResponse.json(
      { ok: false, error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  const hash = await bcrypt.hash(parsed.data.password, 12);
  const user = await User.create({
    name: parsed.data.name,
    email: parsed.data.email,
    password: hash,
  });

  // Seed default categories for this user
  await Category.insertMany(
    DEFAULT_CATEGORIES.map((cat) => ({ ...cat, userId: user._id })),
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
