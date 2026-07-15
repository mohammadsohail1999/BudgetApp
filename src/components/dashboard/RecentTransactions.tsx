"use client";

import { ICON_MAP } from "@/components/categories/iconMap";
import type { RecentTransaction } from "@/types";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Link from "next/link";

function formatCurrency(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

interface Props {
  transactions: RecentTransaction[];
}

export default function RecentTransactions({ transactions }: Props) {
  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1,
          }}
        >
          <Typography variant="h6">Recent Transactions</Typography>
          <Button component={Link} href="/app/transactions" size="small" variant="text">
            View all
          </Button>
        </Box>

        {transactions.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No transactions yet
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {transactions.map((txn, idx) => {
              const Icon = ICON_MAP[txn.categoryIcon] ?? ICON_MAP["category"];
              return (
                <Box key={txn.id}>
                  {idx > 0 && <Divider component="li" />}
                  <ListItem alignItems="flex-start" disableGutters sx={{ py: 1.5 }}>
                    <ListItemAvatar>
                      <Avatar
                        sx={{ bgcolor: txn.categoryColor, width: 38, height: 38 }}
                      >
                        {Icon && (
                          <Icon
                            sx={{ fontSize: 18, color: "#fff" }}
                            aria-hidden="true"
                          />
                        )}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {txn.description || txn.categoryName}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {txn.categoryName} · {formatDate(txn.date)}
                        </Typography>
                      }
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color:
                          txn.type === "income" ? "secondary.main" : "error.main",
                        alignSelf: "center",
                        ml: 2,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {txn.type === "income" ? "+" : "−"}
                      {formatCurrency(txn.amount)}
                    </Typography>
                  </ListItem>
                </Box>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
