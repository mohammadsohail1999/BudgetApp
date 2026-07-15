"use client";

import type { CategorySpending } from "@/types";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  Tooltip,
  type TooltipItem,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  byCategory: CategorySpending[];
}

export default function SpendingByCategoryChart({ byCategory }: Props) {
  const theme = useTheme();

  if (byCategory.length === 0) {
    return (
      <Card sx={{ height: "100%" }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Spending by Category
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 260,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No expense data this month
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const data = {
    labels: byCategory.map((c) => c.categoryName),
    datasets: [
      {
        data: byCategory.map((c) => c.total / 100),
        backgroundColor: byCategory.map((c) => c.color),
        borderColor: theme.palette.background.paper,
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: theme.palette.text.primary,
          padding: 14,
          usePointStyle: true,
          pointStyleWidth: 10,
          font: { size: 12 },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<"doughnut">) => {
            const pct = byCategory[ctx.dataIndex]?.percentage ?? 0;
            const val = (ctx.parsed as number).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            });
            return `  ₹${val}  (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Spending by Category
        </Typography>
        <Box sx={{ height: 300 }}>
          <Doughnut data={data} options={options} />
        </Box>
      </CardContent>
    </Card>
  );
}
