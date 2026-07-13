"use client";

import { createTheme } from "@mui/material/styles";

const sharedTypography = {
  fontFamily: "var(--font-geist-sans), Inter, sans-serif",
};

export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#6366f1" },
    secondary: { main: "#10b981" },
    error: { main: "#ef4444" },
    warning: { main: "#f59e0b" },
    success: { main: "#22c55e" },
    background: {
      default: "#f9fafb",
      paper: "#ffffff",
    },
  },
  typography: sharedTypography,
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined", size: "small" },
    },
    MuiCard: {
      defaultProps: { variant: "outlined" },
    },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#818cf8" },
    secondary: { main: "#34d399" },
    error: { main: "#f87171" },
    warning: { main: "#fbbf24" },
    success: { main: "#4ade80" },
    background: {
      default: "#0f172a",
      paper: "#1e293b",
    },
  },
  typography: sharedTypography,
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined", size: "small" },
    },
    MuiCard: {
      defaultProps: { variant: "outlined" },
    },
  },
});
