"use client";

import { useState } from "react";
import type { Category } from "@/types";
import CategoryCard from "./CategoryCard";
import CategoryFormModal from "./CategoryFormModal";
import DeleteCategoryDialog from "./DeleteCategoryDialog";
import AddIcon from "@mui/icons-material/Add";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

interface Props {
  categories: Category[];
}

export default function CategoriesView({ categories }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  function openCreate() {
    setSelected(null);
    setFormOpen(true);
  }

  function openEdit(category: Category) {
    setSelected(category);
    setFormOpen(true);
  }

  function openDelete(category: Category) {
    setSelected(category);
    setDeleteOpen(true);
  }

  function showToast(message: string) {
    setToast({ open: true, message });
  }

  const userCategories = categories.filter((c) => !c.isDefault);
  const defaultCategories = categories.filter((c) => c.isDefault);

  return (
    <>
      {/* Page header */}
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", mb: 3 }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Categories
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Organise your income and expenses your way
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New Category
        </Button>
      </Stack>

      {/* User-created categories */}
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: "block", mb: 1.5 }}
      >
        My Categories ({userCategories.length})
      </Typography>

      {userCategories.length === 0 ? (
        <Stack
          spacing={1.5}
          sx={{
            alignItems: "center",
            justifyContent: "center",
            py: 8,
            mb: 4,
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          <CategoryOutlinedIcon sx={{ fontSize: 48, color: "text.disabled" }} />
          <Typography variant="h6" color="text.secondary">
            No custom categories yet
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ textAlign: "center" }}>
            Create one to organise your transactions your way.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            sx={{ mt: 0.5 }}
          >
            Add Category
          </Button>
        </Stack>
      ) : (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {userCategories.map((cat) => (
            <Grid key={cat.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <CategoryCard
                category={cat}
                onEdit={openEdit}
                onDelete={openDelete}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Default categories */}
      {defaultCategories.length > 0 && (
        <>
          <Divider sx={{ mb: 3 }} />
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: "block", mb: 1.5 }}
          >
            Default Categories ({defaultCategories.length})
          </Typography>
          <Grid container spacing={2}>
            {defaultCategories.map((cat) => (
              <Grid key={cat.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <CategoryCard
                  category={cat}
                  onEdit={openEdit}
                  onDelete={openDelete}
                />
              </Grid>
            ))}
          </Grid>
        </>
      )}

      <CategoryFormModal
        open={formOpen}
        category={selected}
        onClose={() => setFormOpen(false)}
        onSuccess={showToast}
      />

      <DeleteCategoryDialog
        open={deleteOpen}
        category={selected}
        onClose={() => setDeleteOpen(false)}
        onSuccess={showToast}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="success"
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
}
