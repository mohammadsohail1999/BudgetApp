import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Category as CategoryModel } from "@/models/Category";
import type { Category } from "@/types";
import { getServerSession } from "next-auth";

export async function getCategories(): Promise<Category[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];

  try {
    await connectDB();
    const docs = await CategoryModel.find({ userId: session.user.id })
      .sort({ name: 1 })
      .select("-__v")
      .lean();

    return docs.map((doc) => ({
      id: String(doc._id),
      userId: String(doc.userId),
      name: doc.name,
      type: doc.type,
      color: doc.color,
      icon: doc.icon,
      isDefault: doc.isDefault,
      createdAt: (doc.createdAt as unknown as Date).toISOString(),
      updatedAt: (doc.updatedAt as unknown as Date).toISOString(),
    }));
  } catch {
    return [];
  }
}
