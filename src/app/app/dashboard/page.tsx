import { authOptions } from "@/lib/auth";
import {
  getMonthlySummary,
  getMonthlyTrend,
  getRecentTransactions,
} from "@/lib/queries/dashboard";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import MonthNavigation from "@/components/dashboard/MonthNavigation";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import SummaryCards from "@/components/dashboard/SummaryCards";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const params = await searchParams;
  const now = new Date();

  const rawYear =
    typeof params.year === "string" ? parseInt(params.year, 10) : NaN;
  const rawMonth =
    typeof params.month === "string" ? parseInt(params.month, 10) : NaN;

  const year =
    !isNaN(rawYear) && rawYear >= 2000 && rawYear <= 2100
      ? rawYear
      : now.getFullYear();
  const month =
    !isNaN(rawMonth) && rawMonth >= 1 && rawMonth <= 12
      ? rawMonth
      : now.getMonth() + 1;

  const [summary, trend, recent] = await Promise.all([
    getMonthlySummary(year, month),
    getMonthlyTrend(6),
    getRecentTransactions(5),
  ]);

  const prevDate = new Date(year, month - 2, 1);
  const nextDate = new Date(year, month, 1);
  const prevUrl = `/app/dashboard?year=${prevDate.getFullYear()}&month=${prevDate.getMonth() + 1}`;
  const nextUrl = `/app/dashboard?year=${nextDate.getFullYear()}&month=${nextDate.getMonth() + 1}`;
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;
  const monthLabel = new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, flexGrow: 1 }}>
          Dashboard
        </Typography>
        <MonthNavigation
          prevUrl={prevUrl}
          nextUrl={nextUrl}
          monthLabel={monthLabel}
          isCurrentMonth={isCurrentMonth}
        />
      </Box>

      <SummaryCards summary={summary} />

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <DashboardCharts trend={trend} byCategory={summary.byCategory} />
        <Grid size={{ xs: 12 }}>
          <RecentTransactions transactions={recent} />
        </Grid>
      </Grid>
    </Container>
  );
}
