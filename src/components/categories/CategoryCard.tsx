"use client";

import type { Category } from "@/types";
import { ICON_MAP } from "./iconMap";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import LockIcon from "@mui/icons-material/Lock";
import CategoryIcon from "@mui/icons-material/Category";

const TYPE_COLOR = {
  income: "success",
  expense: "error",
  both: "primary",
} as const;

const TYPE_LABEL: Record<string, string> = {
  income: "Income",
  expense: "Expense",
  both: "Both",
};

interface Props {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export default function CategoryCard({ category, onEdit, onDelete }: Props) {
  const Icon = ICON_MAP[category.icon] ?? CategoryIcon;

  return (
    <Card
      variant="outlined"
      sx={{
        borderLeft: `4px solid ${category.color}`,
        height: "100%",
        position: "relative",
      }}
    >
      {category.isDefault && (
        <Chip
          label="Default"
          size="small"
          icon={<LockIcon />}
          sx={{ position: "absolute", top: 10, right: 10, fontSize: "0.68rem" }}
        />
      )}

      <CardContent>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", mb: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              bgcolor: `${category.color}22`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon sx={{ color: category.color, fontSize: 22 }} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, pr: category.isDefault ? 8 : 0 }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
              {category.name}
            </Typography>
            <Chip
              label={TYPE_LABEL[category.type]}
              color={TYPE_COLOR[category.type]}
              size="small"
              sx={{ mt: 0.5, fontSize: "0.68rem", height: 20 }}
            />
          </Box>
        </Stack>

        {!category.isDefault && (
          <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}>
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={() => onEdit(category)}
                aria-label={`Edit ${category.name}`}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                color="error"
                onClick={() => onDelete(category)}
                aria-label={`Delete ${category.name}`}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
