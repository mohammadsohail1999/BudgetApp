"use client";

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Link from "next/link";

interface Props {
  prevUrl: string;
  nextUrl: string;
  monthLabel: string;
  isCurrentMonth: boolean;
}

export default function MonthNavigation({
  prevUrl,
  nextUrl,
  monthLabel,
  isCurrentMonth,
}: Props) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <IconButton component={Link} href={prevUrl} aria-label="Previous month" size="small">
        <ChevronLeftIcon />
      </IconButton>
      <Typography
        variant="subtitle1"
        sx={{ minWidth: 160, textAlign: "center", fontWeight: 500 }}
      >
        {monthLabel}
      </Typography>
      {isCurrentMonth ? (
        <IconButton aria-label="Next month" size="small" disabled>
          <ChevronRightIcon />
        </IconButton>
      ) : (
        <IconButton component={Link} href={nextUrl} aria-label="Next month" size="small">
          <ChevronRightIcon />
        </IconButton>
      )}
    </Box>
  );
}
