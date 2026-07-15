"use client";

import { useEffect, useState, useTransition } from "react";
import type { Category } from "@/types";
import { createCategory, updateCategory } from "@/actions/categories";
import { ICON_OPTIONS } from "./iconMap";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";

const DEFAULT_COLOR = "#6366f1";
const DEFAULT_ICON = ICON_OPTIONS[0].slug;

interface Props {
  open: boolean;
  category?: Category | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function CategoryFormModal({
  open,
  category,
  onClose,
  onSuccess,
}: Props) {
  const isEditing = !!category;
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense" | "both">("expense");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [icon, setIcon] = useState(DEFAULT_ICON);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (category) {
      setName(category.name);
      setType(category.type);
      setColor(category.color);
      setIcon(ICON_OPTIONS.some((o) => o.slug === category.icon) ? category.icon : DEFAULT_ICON);
    } else {
      setName("");
      setType("expense");
      setColor(DEFAULT_COLOR);
      setIcon(DEFAULT_ICON);
    }
  }, [open, category]);

  function handleSubmit() {
    setFormError(null);
    const input = { name: name.trim(), type, color, icon };

    startTransition(async () => {
      const result = isEditing
        ? await updateCategory({ id: category!.id, ...input })
        : await createCategory(input);

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      onSuccess(isEditing ? "Category updated." : "Category created.");
      onClose();
    });
  }

  const selectedIconOption = ICON_OPTIONS.find((o) => o.slug === icon);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        {isEditing ? "Edit Category" : "New Category"}
        <IconButton onClick={onClose} size="small" aria-label="Close dialog">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          {formError && (
            <Alert severity="error" onClose={() => setFormError(null)}>
              {formError}
            </Alert>
          )}

          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
            helperText={`${name.length}/50`}
            slotProps={{ htmlInput: { maxLength: 50 } }}
          />

          <FormControl fullWidth required>
            <InputLabel>Type</InputLabel>
            <Select
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
            >
              <MenuItem value="expense">Expense</MenuItem>
              <MenuItem value="income">Income</MenuItem>
              <MenuItem value="both">Both</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth required>
            <InputLabel>Icon</InputLabel>
            <Select
              label="Icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              renderValue={() =>
                selectedIconOption ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <selectedIconOption.Icon fontSize="small" />
                    <span>{selectedIconOption.label}</span>
                  </Box>
                ) : null
              }
            >
              {ICON_OPTIONS.map(({ slug, label, Icon }) => (
                <MenuItem key={slug} value={slug}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Icon fontSize="small" />
                    <span>{label}</span>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 0.75 }}
            >
              Color
            </Typography>
            <Box
              component="input"
              type="color"
              value={color}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setColor(e.target.value)
              }
              aria-label="Category color"
              sx={{
                width: "100%",
                height: 44,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                cursor: "pointer",
                padding: "2px 4px",
                bgcolor: "transparent",
              }}
            />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button variant="outlined" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isPending || !name.trim()}
          startIcon={
            isPending ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          {isPending
            ? "Saving…"
            : isEditing
              ? "Save Changes"
              : "Create Category"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
