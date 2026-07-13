import { authOptions } from "@/lib/auth";
import { getCategories } from "@/lib/queries/categories";
import {
  getTransactions,
  type TransactionFilters,
} from "@/lib/queries/transactions";
import ExpenseTable from "@/components/expenses/ExpenseTable";
import Container from "@mui/material/Container";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

type SearchParams = { [key: string]: string | string[] | undefined };

function parseFilters(params: SearchParams): TransactionFilters {
  const type =
    typeof params.type === "string" &&
    ["income", "expense"].includes(params.type)
      ? (params.type as "income" | "expense")
      : undefined;

  const categoryId =
    typeof params.categoryId === "string" &&
    /^[a-f\d]{24}$/i.test(params.categoryId)
      ? params.categoryId
      : undefined;

  const search =
    typeof params.search === "string"
      ? params.search.slice(0, 100).trim() || undefined
      : undefined;

  const rawPage =
    typeof params.page === "string" ? parseInt(params.page, 10) : NaN;
  const page = !isNaN(rawPage) && rawPage >= 1 ? rawPage : 1;

  const rawLimit =
    typeof params.limit === "string" ? parseInt(params.limit, 10) : NaN;
  const limit =
    !isNaN(rawLimit) && rawLimit >= 1 && rawLimit <= 100 ? rawLimit : 15;

  return { type, categoryId, search, page, limit };
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const params = await searchParams;
  const filters = parseFilters(params);

  const [{ transactions, total }, categories] = await Promise.all([
    getTransactions(filters),
    getCategories(),
  ]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <ExpenseTable
        transactions={transactions}
        total={total}
        categories={categories}
        filters={filters}
      />
    </Container>
  );
}
