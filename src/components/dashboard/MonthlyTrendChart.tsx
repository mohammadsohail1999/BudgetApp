"use client";

import type { MonthlyTrendItem } from "@/types";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
  type TooltipItem,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface Props {
  trend: MonthlyTrendItem[];
}

export default function MonthlyTrendChart({ trend }: Props) {
  const theme = useTheme();

  const labels = trend.map((t) => `${MONTH_NAMES[t.month - 1]} ${t.year}`);

  const data = {
    labels,
    datasets: [
      {
        label: "Income",
        data: trend.map((t) => t.totalIncome / 100),
        backgroundColor: theme.palette.secondary.main + "cc",
        borderColor: theme.palette.secondary.main,
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false as const,
      },
      {
        label: "Expenses",
        data: trend.map((t) => t.totalExpenses / 100),
        backgroundColor: theme.palette.error.main + "cc",
        borderColor: theme.palette.error.main,
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false as const,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: theme.palette.text.primary,
          usePointStyle: true,
          pointStyleWidth: 10,
          font: { size: 12 },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<"bar">) => {
            const val = Number(ctx.parsed.y).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            });
            return `  ${ctx.dataset.label}: ₹${val}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: theme.palette.text.secondary, font: { size: 11 } },
        grid: { color: theme.palette.divider },
      },
      y: {
        ticks: {
          color: theme.palette.text.secondary,
          font: { size: 11 },
          callback: (value: number | string) =>
            `₹${Number(value).toLocaleString("en-IN")}`,
        },
        grid: { color: theme.palette.divider },
      },
    },
  };

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Income vs Expenses
        </Typography>
        <Box sx={{ height: 300 }}>
          <Bar data={data} options={options} />
        </Box>
      </CardContent>
    </Card>
  );
}
