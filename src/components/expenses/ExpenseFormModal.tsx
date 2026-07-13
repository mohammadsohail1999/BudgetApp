"use client";

import {
  createTransaction,
  updateTransaction,
} from "@/actions/transactions";
import {
  transactionFormSchema,
  zodFieldErrors,
} from "@/lib/schemas/transaction";
import type { Category, Transaction } from "@/types";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import CloseIcon from "@mui/icons-material/Close";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState, useTransition } from "react";

interface FormValues {
  type: "income" | "expense" | "";
  amount: string;
  categoryId: string;
  description: string;
  date: Dayjs | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  initialData?: Transaction;
  onSuccess: (message: string) => void;
}

export default function ExpenseFormModal({
  open,
  onClose,
  categories,
  initialData,
  onSuccess,
}: Props) {
  const isEditing = !!initialData;
  const [isPending, startTransition] = useTransition();

  const [formValues, setFormValues] = useState<FormValues>({
    type: "",
    amount: "",
    categoryId: "",
    description: "",
    date: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setFormError(null);

    if (initialData) {
      setFormValues({
        type: initialData.type,
        amount: (initialData.amount / 100).toFixed(2),
        categoryId: initialData.categoryId,
        description: initialData.description ?? "",
        date: dayjs(initialData.date),
      });
    } else {
      setFormValues({
        type: "",
        amount: "",
        categoryId: "",
        description: "",
        date: dayjs(),
      });
    }
  }, [open, initialData]);

  const availableCategories = useMemo(() => {
    if (!formValues.type) return [];
    return categories.filter(
      (c) => c.type === formValues.type || c.type === "both",
    );
  }, [formValues.type, categories]);

  function handleTypeChange(newType: "income" | "expense") {
    setFormValues((prev) => ({ ...prev, type: newType, categoryId: "" }));
    setErrors((prev) => ({ ...prev, type: "", categoryId: "" }));
  }

  function handleSubmit() {
    const amountNum = formValues.amount ? parseFloat(formValues.amount) : NaN;

    const result = transactionFormSchema.safeParse({
      type: formValues.type || undefined,
      amount: isNaN(amountNum) ? undefined : amountNum,
      categoryId: formValues.categoryId || undefined,
      description: formValues.description || undefined,
      date: formValues.date?.format("YYYY-MM-DD") ?? "",
    });

    if (!result.success) {
      setErrors(zodFieldErrors(result.error));
      return;
    }

    setErrors({});
    setFormError(null);

    startTransition(async () => {
      if (isEditing && initialData) {
        const res = await updateTransaction({ id: initialData.id, ...result.data });
        if (!res.ok) {
          setFormError(res.error);
          return;
        }
        onSuccess("Transaction updated successfully.");
      } else {
        const res = await createTransaction(result.data);
        if (!res.ok) {
          setFormError(res.error);
          return;
        }
        onSuccess("Transaction created successfully.");
      }
      onClose();
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        {isEditing ? "Edit Transaction" : "Add Transaction"}
        <IconButton aria-label="Close dialog" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {formError && (
            <Alert severity="error" onClose={() => setFormError(null)}>
              {formError}
            </Alert>
          )}

          {/* Type */}
          <FormControl fullWidth required error={!!errors.type}>
            <InputLabel>Type</InputLabel>
            <Select
              label="Type"
              value={formValues.type}
              onChange={(e) =>
                handleTypeChange(e.target.value as "income" | "expense")
              }
            >
              <MenuItem value="income">Income</MenuItem>
              <MenuItem value="expense">Expense</MenuItem>
            </Select>
            {errors.type && <FormHelperText>{errors.type}</FormHelperText>}
          </FormControl>

          {/* Category */}
          <FormControl fullWidth required error={!!errors.categoryId} disabled={!formValues.type}>
            <InputLabel>Category</InputLabel>
            <Select
              label="Category"
              value={formValues.categoryId}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, categoryId: e.target.value }))
              }
            >
              {availableCategories.length === 0 && (
                <MenuItem value="" disabled>
                  {formValues.type ? "No categories available" : "Select a type first"}
                </MenuItem>
              )}
              {availableCategories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: c.color,
                        flexShrink: 0,
                      }}
                    />
                    {c.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
            {errors.categoryId && (
              <FormHelperText>{errors.categoryId}</FormHelperText>
            )}
          </FormControl>

          {/* Amount */}
          <TextField
            label="Amount"
            type="number"
            required
            fullWidth
            value={formValues.amount}
            onChange={(e) =>
              setFormValues((prev) => ({ ...prev, amount: e.target.value }))
            }
            error={!!errors.amount}
            helperText={errors.amount}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">₹</InputAdornment>
                ),
              },
              htmlInput: { min: 0.01, step: 0.01 },
            }}
          />

          {/* Date */}
          <DatePicker
            label="Date"
            value={formValues.date}
            onChange={(val) =>
              setFormValues((prev) => ({ ...prev, date: val }))
            }
            disableFuture
            slotProps={{
              textField: {
                fullWidth: true,
                required: true,
                error: !!errors.date,
                helperText: errors.date,
              },
            }}
          />

          {/* Description */}
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={formValues.description}
            onChange={(e) =>
              setFormValues((prev) => ({ ...prev, description: e.target.value }))
            }
            error={!!errors.description}
            helperText={
              errors.description ??
              `${formValues.description.length}/300 characters`
            }
            slotProps={{ htmlInput: { maxLength: 300 } }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button variant="outlined" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isPending}
          startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isPending ? "Saving…" : isEditing ? "Save Changes" : "Add Transaction"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
