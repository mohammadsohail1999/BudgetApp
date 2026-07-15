"use client";

import { useState, useTransition } from "react";
import type { Category } from "@/types";
import { deleteCategory } from "@/actions/categories";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";

interface Props {
  open: boolean;
  category: Category | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function DeleteCategoryDialog({
  open,
  category,
  onClose,
  onSuccess,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!category) return;
    setError(null);

    startTransition(async () => {
      const result = await deleteCategory({ id: category.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const { deletedTransactions } = result.data;
      const message =
        deletedTransactions > 0
          ? `"${category.name}" deleted along with ${deletedTransactions} transaction${deletedTransactions === 1 ? "" : "s"}.`
          : `"${category.name}" deleted.`;
      onSuccess(message);
      onClose();
    });
  }

  function handleClose() {
    if (isPending) return;
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Category</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Typography>
          Delete <strong>{category?.name}</strong>? This cannot be undone.
        </Typography>
        <Typography sx={{ mt: 1.5, color: "error.main" }}>
          All transactions linked to this category will also be permanently
          deleted.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button variant="outlined" onClick={handleClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDelete}
          disabled={isPending}
          startIcon={
            isPending ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          {isPending ? "Deleting…" : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
