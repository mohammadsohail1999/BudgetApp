import { authOptions } from "@/lib/auth";
import { getCategories } from "@/lib/queries/categories";
import CategoriesView from "@/components/categories/CategoriesView";
import Container from "@mui/material/Container";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function CategoriesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const categories = await getCategories();

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <CategoriesView categories={categories} />
    </Container>
  );
}
