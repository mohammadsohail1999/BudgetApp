import type { MonthlySummary } from "@/types";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";

function formatCurrency(paise: number): string {
  return `₹${(Math.abs(paise) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface StatCardProps {
  label: string;
  value: string;
  avatarSx: SxProps<Theme>;
  icon: React.ReactNode;
  valueColor?: string;
  prefix?: string;
}

function StatCard({ label, value, avatarSx, icon, valueColor, prefix }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {label}
            </Typography>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: valueColor ?? "text.primary" }}
            >
              {prefix}{value}
            </Typography>
          </Box>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              flexShrink: 0,
              "& svg": { fontSize: 24 },
              ...avatarSx,
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

interface Props {
  summary: MonthlySummary;
}

export default function SummaryCards({ summary }: Props) {
  const isPositiveNet = summary.net >= 0;

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <StatCard
          label="Total Income"
          value={formatCurrency(summary.totalIncome)}
          avatarSx={{ bgcolor: "secondary.main" }}
          icon={<TrendingUpIcon sx={{ color: "#fff" }} />}
          valueColor="secondary.main"
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <StatCard
          label="Total Expenses"
          value={formatCurrency(summary.totalExpenses)}
          avatarSx={{ bgcolor: "error.main" }}
          icon={<TrendingDownIcon sx={{ color: "#fff" }} />}
          valueColor="error.main"
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <StatCard
          label="Net Balance"
          value={formatCurrency(summary.net)}
          avatarSx={{
            bgcolor: isPositiveNet ? "primary.main" : "error.main",
          }}
          icon={<AccountBalanceIcon sx={{ color: "#fff" }} />}
          valueColor={isPositiveNet ? "primary.main" : "error.main"}
          prefix={summary.net < 0 ? "-" : ""}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <StatCard
          label="Transactions"
          value={String(summary.transactionCount)}
          avatarSx={{ bgcolor: "primary.main" }}
          icon={<ReceiptLongIcon sx={{ color: "#fff" }} />}
        />
      </Grid>
    </Grid>
  );
}
