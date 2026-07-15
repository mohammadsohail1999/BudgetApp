"use client";

import type { CategorySpending, MonthlyTrendItem } from "@/types";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import dynamic from "next/dynamic";

const MonthlyTrendChart = dynamic(
  () => import("@/components/dashboard/MonthlyTrendChart"),
  {
    ssr: false,
    loading: () => (
      <Skeleton variant="rectangular" height={332} sx={{ borderRadius: 1 }} />
    ),
  },
);

const SpendingByCategoryChart = dynamic(
  () => import("@/components/dashboard/SpendingByCategoryChart"),
  {
    ssr: false,
    loading: () => (
      <Skeleton variant="rectangular" height={332} sx={{ borderRadius: 1 }} />
    ),
  },
);

interface Props {
  trend: MonthlyTrendItem[];
  byCategory: CategorySpending[];
}

export default function DashboardCharts({ trend, byCategory }: Props) {
  return (
    <>
      <Grid size={{ xs: 12, md: 7 }}>
        <MonthlyTrendChart trend={trend} />
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <SpendingByCategoryChart byCategory={byCategory} />
      </Grid>
    </>
  );
}
