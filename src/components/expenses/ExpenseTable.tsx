"use client";

import { deleteTransaction } from "@/actions/transactions";
import type { TransactionFilters } from "@/lib/queries/transactions";
import type { Category, Transaction } from "@/types";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SearchIcon from "@mui/icons-material/Search";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import { alpha, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
} from "@mui/x-data-grid";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import ExpenseFormModal from "./ExpenseFormModal";

interface TransactionRow extends Transaction {
  categoryName: string;
  categoryColor: string;
}

interface Props {
  transactions: Transaction[];
  total: number;
  categories: Category[];
  filters: TransactionFilters;
}

const FEATURES = [
  {
    icon: <ReceiptLongIcon sx={{ fontSize: 28 }} />,
    title: "Log Transactions",
    desc: "Record income and expenses with categories, dates, and notes.",
  },
  {
    icon: <SearchIcon sx={{ fontSize: 28 }} />,
    title: "Search & Filter",
    desc: "Find any transaction instantly by description, type, or category.",
  },
  {
    icon: <TrendingUpIcon sx={{ fontSize: 28 }} />,
    title: "Track Progress",
    desc: "Monitor your financial patterns and take control of your money.",
  },
] as const;

// Every renderCell must return a Box like this so cells align vertically.
function Cell({ children, justifyContent = "flex-start" }: {
  children: React.ReactNode;
  justifyContent?: string;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent,
        width: "100%",
        height: "100%",
      }}
    >
      {children}
    </Box>
  );
}

export default function ExpenseTable({
  transactions,
  total,
  categories,
  filters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<Transaction | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteIsPending, startDeleteTransition] = useTransition();
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(muiTheme.breakpoints.between("sm", "md"));
  const columnVisibilityModel = useMemo(
    () => ({
      type: !isMobile,
      categoryName: !isMobile,
      description: !isMobile && !isTablet,
    }),
    [isMobile, isTablet],
  );

  useEffect(() => {
    setSearchInput(filters.search ?? "");
  }, [filters.search]);

  // Debounce search → URL update
  useEffect(() => {
    const timer = setTimeout(() => {
      const current = filters.search ?? "";
      if (searchInput !== current) {
        updateFilters({ search: searchInput || undefined, page: 1 });
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const categoriesMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const rows: TransactionRow[] = useMemo(
    () =>
      transactions.map((t) => ({
        ...t,
        categoryName: categoriesMap[t.categoryId]?.name ?? "—",
        categoryColor: categoriesMap[t.categoryId]?.color ?? "#888888",
      })),
    [transactions, categoriesMap],
  );

  const filteredCategoryOptions = useMemo(() => {
    if (!filters.type) return categories;
    return categories.filter((c) => c.type === filters.type || c.type === "both");
  }, [categories, filters.type]);

  function updateFilters(updates: Partial<TransactionFilters>) {
    const merged = { ...filters, ...updates };
    const params = new URLSearchParams();
    if (merged.type) params.set("type", merged.type);
    if (merged.categoryId) params.set("categoryId", merged.categoryId);
    if (merged.search) params.set("search", merged.search);
    if (merged.page !== 1) params.set("page", String(merged.page));
    if (merged.limit !== 15) params.set("limit", String(merged.limit));
    router.replace(`${pathname}?${params.toString()}`);
  }

  function handleTypeFilterChange(value: string) {
    const newType = value as "income" | "expense" | undefined;
    let newCategoryId = filters.categoryId;
    if (newCategoryId && newType) {
      const cat = categories.find((c) => c.id === newCategoryId);
      if (cat && cat.type !== newType && cat.type !== "both") newCategoryId = undefined;
    }
    updateFilters({ type: newType || undefined, categoryId: newCategoryId, page: 1 });
  }

  function handleDeleteConfirm() {
    if (!deleteId) return;
    startDeleteTransition(async () => {
      const res = await deleteTransaction({ id: deleteId });
      setDeleteId(null);
      setSnackbar({
        open: true,
        message: res.ok ? "Transaction deleted." : res.error,
        severity: res.ok ? "success" : "error",
      });
    });
  }

  function openAddModal() {
    setEditData(undefined);
    setModalOpen(true);
  }

  // ── Column definitions ──────────────────────────────────────────────────────
  const columns: GridColDef<TransactionRow>[] = [
    {
      field: "date",
      headerName: "Date",
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams<TransactionRow, string>) => {
        const d = new Date((params.value ?? "") + "T00:00:00");
        return (
          <Cell>
            <Typography variant="body2" component="span">
              {d.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Typography>
          </Cell>
        );
      },
    },
    {
      field: "type",
      headerName: "Type",
      width: 110,
      sortable: false,
      renderCell: (params: GridRenderCellParams<TransactionRow, string>) => (
        <Cell>
          <Chip
            label={params.value === "income" ? "Income" : "Expense"}
            color={params.value === "income" ? "success" : "error"}
            size="small"
            variant="outlined"
          />
        </Cell>
      ),
    },
    {
      field: "categoryName",
      headerName: "Category",
      width: 160,
      sortable: false,
      renderCell: (params: GridRenderCellParams<TransactionRow, string>) => (
        <Cell>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: params.row.categoryColor,
              flexShrink: 0,
              mr: 1,
            }}
          />
          <Typography variant="body2" component="span">
            {params.value}
          </Typography>
        </Cell>
      ),
    },
    {
      field: "amount",
      headerName: "Amount",
      width: 150,
      sortable: false,
      align: "right",
      headerAlign: "right",
      renderCell: (params: GridRenderCellParams<TransactionRow, number>) => {
        const isIncome = params.row.type === "income";
        const formatted = ((params.value ?? 0) / 100).toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        return (
          <Cell justifyContent="flex-end">
            <Typography
              variant="body2"
              component="span"
              sx={{ fontWeight: 600, color: isIncome ? "success.main" : "error.main" }}
            >
              {isIncome ? "+" : "−"}₹{formatted}
            </Typography>
          </Cell>
        );
      },
    },
    {
      field: "description",
      headerName: "Description",
      flex: 1,
      minWidth: 180,
      sortable: false,
      renderCell: (params: GridRenderCellParams<TransactionRow, string | undefined>) => (
        <Cell>
          {params.value ? (
            <Tooltip title={params.value} placement="top-start">
              <Typography
                variant="body2"
                component="span"
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                  display: "block",
                }}
              >
                {params.value}
              </Typography>
            </Tooltip>
          ) : (
            <Typography variant="body2" component="span" color="text.disabled">
              —
            </Typography>
          )}
        </Cell>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<TransactionRow>) => (
        <Cell justifyContent="center">
          <IconButton
            size="small"
            aria-label="Edit transaction"
            onClick={() => {
              setEditData(params.row);
              setModalOpen(true);
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            aria-label="Delete transaction"
            color="error"
            onClick={() => setDeleteId(params.row.id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Cell>
      ),
    },
  ];

  // ── Shared overlays (modal, delete dialog, snackbar) ───────────────────────
  const sharedOverlays = (
    <>
      <ExpenseFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        categories={categories}
        initialData={editData}
        onSuccess={(msg) =>
          setSnackbar({ open: true, message: msg, severity: "success" })
        }
      />

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Transaction</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This transaction will be permanently deleted. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteId(null)}
            disabled={deleteIsPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleteIsPending}
            startIcon={
              deleteIsPending ? <CircularProgress size={16} color="inherit" /> : undefined
            }
          >
            {deleteIsPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );

  // ── Empty state ─────────────────────────────────────────────────────────────
  const hasActiveFilters = !!(filters.type || filters.categoryId || filters.search);
  if (total === 0 && !hasActiveFilters) {
    return (
      <>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            py: { xs: 8, md: 12 },
            px: 2,
          }}
        >
          <Box
            sx={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 3,
            }}
          >
            <AccountBalanceWalletIcon sx={{ fontSize: 44, color: "primary.main" }} />
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1.5 }}>
            Start Logging Your Transactions
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 440, mb: 4, lineHeight: 1.7 }}
          >
            Track every rupee you earn and spend. Get a clear picture of your
            financial habits and take control of your money.
          </Typography>

          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={openAddModal}
            sx={{ px: 4, py: 1.5, borderRadius: 2 }}
          >
            Add Your First Transaction
          </Button>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ mt: 8, width: "100%", maxWidth: 680 }}
          >
            {FEATURES.map((f) => (
              <Card
                key={f.title}
                variant="outlined"
                sx={{ flex: 1, transition: "box-shadow 0.2s", "&:hover": { boxShadow: 3 } }}
              >
                <CardContent sx={{ textAlign: "center", py: 3 }}>
                  <Box
                    sx={{
                      display: "inline-flex",
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                      color: "primary.main",
                      mb: 1.5,
                    }}
                  >
                    {f.icon}
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {f.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {f.desc}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
        {sharedOverlays}
      </>
    );
  }

  // ── Table view ──────────────────────────────────────────────────────────────
  return (
    <>
      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{ mb: 3, gap: 2, alignItems: { sm: "flex-end" }, justifyContent: "space-between" }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Transactions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {total} transaction{total !== 1 ? "s" : ""} total
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openAddModal}
          sx={{ alignSelf: { xs: "stretch", sm: "auto" } }}
        >
          Add Transaction
        </Button>
      </Stack>

      {/* Filters toolbar */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        {/* Search — takes remaining space on desktop, full width on mobile */}
        <TextField
          placeholder="Search by description…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          size="small"
          sx={{ flex: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
        />

        {/* Type filter */}
        <FormControl size="small" sx={{ minWidth: { sm: 140 }, width: { xs: "100%", sm: "auto" } }}>
          <InputLabel shrink>Type</InputLabel>
          <Select
            label="Type"
            notched
            displayEmpty
            value={filters.type ?? ""}
            onChange={(e) => handleTypeFilterChange(e.target.value)}
          >
            <MenuItem value="">All Types</MenuItem>
            <MenuItem value="income">Income</MenuItem>
            <MenuItem value="expense">Expense</MenuItem>
          </Select>
        </FormControl>

        {/* Category filter */}
        <FormControl size="small" sx={{ minWidth: { sm: 160 }, width: { xs: "100%", sm: "auto" } }}>
          <InputLabel shrink>Category</InputLabel>
          <Select
            label="Category"
            notched
            displayEmpty
            value={filters.categoryId ?? ""}
            onChange={(e) =>
              updateFilters({ categoryId: e.target.value || undefined, page: 1 })
            }
          >
            <MenuItem value="">All Categories</MenuItem>
            {filteredCategoryOptions.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* Data table — Card clips overflow so the grid scrolls on small screens */}
      <Card variant="outlined" sx={{ overflow: "hidden" }}>
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            rowCount={total}
            paginationMode="server"
            paginationModel={{ page: filters.page - 1, pageSize: filters.limit }}
            onPaginationModelChange={({ page, pageSize }) => {
              updateFilters({ page: page + 1, limit: pageSize });
            }}
            pageSizeOptions={[15, 25, 50, 100]}
            columnVisibilityModel={columnVisibilityModel}
            disableRowSelectionOnClick
            disableColumnFilter
            disableColumnMenu
            autoHeight
            sx={{
              border: 0,
              // Ensure cells vertically center their content
              "& .MuiDataGrid-cell": {
                display: "flex",
                alignItems: "center",
                py: 0,
              },
              "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
                outline: "none",
              },
            }}
            slots={{
              noRowsOverlay: () => (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    gap: 1,
                    py: 6,
                  }}
                >
                  <SearchIcon sx={{ fontSize: 36, color: "text.disabled" }} />
                  <Typography variant="body2" color="text.secondary">
                    No transactions match your filters.
                  </Typography>
                  <Button
                    size="small"
                    onClick={() =>
                      updateFilters({
                        type: undefined,
                        categoryId: undefined,
                        search: undefined,
                        page: 1,
                      })
                    }
                  >
                    Clear filters
                  </Button>
                </Box>
              ),
            }}
          />
        </Box>
      </Card>

      {sharedOverlays}
    </>
  );
}
