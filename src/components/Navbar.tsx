"use client";

import { useThemeMode } from "@/components/ThemeProvider";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import LogoutIcon from "@mui/icons-material/Logout";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { label: "Dashboard", href: "/app/dashboard" },
  { label: "Transactions", href: "/app/transactions" },
  { label: "Categories", href: "/app/categories" },
];

export default function Navbar() {
  const { data: session } = useSession();
  const { mode, toggleMode } = useThemeMode();
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const userName = session?.user?.name ?? "User";
  const userEmail = session?.user?.email ?? "";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: "divider" }}
    >
      <Toolbar sx={{ justifyContent: "space-between", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
          <Typography
            variant="h6"
            component={Link}
            href="/app/dashboard"
            sx={{ textDecoration: "none", color: "text.primary", fontWeight: 700, flexShrink: 0 }}
          >
            Budget App
          </Typography>

          <Box component="nav" sx={{ display: "flex", gap: 0.5 }}>
            {NAV_LINKS.map(({ label, href }) => {
              const active = pathname === href;
              return (
                <Typography
                  key={href}
                  component={Link}
                  href={href}
                  variant="body2"
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 1,
                    textDecoration: "none",
                    fontWeight: active ? 600 : 400,
                    color: active ? "primary.main" : "text.secondary",
                    bgcolor: active ? "action.selected" : "transparent",
                    "&:hover": { bgcolor: "action.hover", color: "text.primary" },
                    transition: "background-color 0.15s, color 0.15s",
                  }}
                >
                  {label}
                </Typography>
              );
            })}
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            onClick={toggleMode}
            size="small"
            aria-label="Toggle theme"
          >
            {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>

          <IconButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            size="small"
            aria-label="User menu"
            aria-controls={open ? "user-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
          >
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: "primary.main",
                fontSize: "0.875rem",
                fontWeight: 600,
              }}
            >
              {initials}
            </Avatar>
          </IconButton>

          <Menu
            id="user-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={() => setAnchorEl(null)}
            onClick={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            slotProps={{
              paper: { sx: { width: 240, mt: 1 } },
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2">{userName}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {userEmail}
              </Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              sx={{ color: "error.main", mt: 0.5 }}
            >
              <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />
              <ListItemText>Sign out</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
