---
name: ui-conventions
description: Use when building or editing any UI component, page, layout, theme/dark-mode logic, form, or data display in this budget-app project. Covers MUI-only styling, theme tokens, layout shell, forms, buttons, cards, data tables, charts, loading/empty states, accessibility, and notifications.
---

# UI Conventions

## Stack

- **Material UI (MUI) v6+** — all UI components, theming, layout, and styling
- **No custom CSS** — zero hand-written CSS, no inline `style` props, no Tailwind utility classes in components
- **No custom component primitives** — use MUI components exclusively (`Box`, `Stack`, `Grid`, `Typography`, `Button`, `TextField`, etc.)
- Tailwind v4 remains in `globals.css` for the root body/html resets only — it does not touch component styling

---

## Theme

### Single source of truth

All design tokens (colors, typography, spacing, shape, shadows) live in `src/lib/theme.ts`. Never hardcode color values, font sizes, or spacing numbers inside components — always reference the theme.

```ts
// src/lib/theme.ts
import { createTheme } from "@mui/material/styles";

export const lightTheme = createTheme({ ... });
export const darkTheme  = createTheme({ ... });
```

### Color palette

| Token | Light | Dark | Usage |
|---|---|---|---|
| `primary` | Violet `#6366f1` | Violet `#818cf8` | CTAs, active states, brand |
| `secondary` | Emerald `#10b981` | Emerald `#34d399` | Income indicators |
| `error` | Red `#ef4444` | Red `#f87171` | Expense indicators, errors |
| `warning` | Amber `#f59e0b` | Amber `#fbbf24` | Budget warnings |
| `success` | Green `#22c55e` | Green `#4ade80` | Confirmations |
| `background.default` | `#f9fafb` | `#0f172a` | Page background |
| `background.paper` | `#ffffff` | `#1e293b` | Cards, surfaces |

### Typography scale

Use MUI's default type scale — do not define custom variants unless absolutely necessary.

| Variant | Usage |
|---|---|
| `h4` | Page titles |
| `h5` | Section headings |
| `h6` | Card headings |
| `subtitle1` | Supporting labels |
| `body1` | Primary body text |
| `body2` | Secondary / helper text |
| `caption` | Timestamps, metadata |

Font family: **Inter** (loaded via `next/font/google` in `layout.tsx`, injected into MUI theme via `typography.fontFamily`).

---

## Dark Mode

- Mode is stored in a React context (`ThemeContext`) and persisted to `localStorage` under the key `budget-theme-mode`.
- The MUI `ThemeProvider` wraps the entire app in `layout.tsx` using the active theme.
- **Never** use CSS `prefers-color-scheme` media queries in components — always read from the MUI theme via `useTheme()` or `sx`.
- Toggle component lives in the top `AppBar` — a single `IconButton` switching between `LightModeIcon` and `DarkModeIcon`.

```tsx
// Reading mode in a component
const theme = useTheme();
const isDark = theme.palette.mode === "dark";
```

---

## Layout

### Page shell

Every authenticated page uses a consistent shell:

```
AppBar (top nav + user menu + theme toggle)
  └── Drawer (sidebar nav — persistent on desktop, temporary on mobile)
        └── Box component=main (page content area)
              └── Container maxWidth="xl" (content width constraint)
```

### Responsive breakpoints (MUI defaults)

| Breakpoint | Width | Behavior |
|---|---|---|
| `xs` | 0px+ | Single column, drawer hidden |
| `sm` | 600px+ | Single column, drawer hidden |
| `md` | 900px+ | Sidebar visible, multi-column layouts unlock |
| `lg` | 1200px+ | Full dashboard grid |

### Grid system

Use MUI `Grid` (v2 API — `Grid size={{ xs: 12, md: 6 }}`) for all multi-column layouts. Never use CSS flexbox or grid directly.

```tsx
<Grid container spacing={3}>
  <Grid size={{ xs: 12, md: 6, lg: 3 }}>
    <SummaryCard />
  </Grid>
</Grid>
```

---

## Components

### Spacing

Use only MUI `spacing` units via the `sx` prop — never pixel values.

```tsx
// ✅ correct
<Box sx={{ p: 3, mb: 2, gap: 1.5 }}>

// ❌ wrong
<Box style={{ padding: "24px", marginBottom: "16px" }}>
```

### Forms

- All form fields: **MUI `TextField`** with `variant="outlined"` and `fullWidth`
- Required fields: always set `required` prop and supply `helperText` for validation messages
- Error state: set `error` and `helperText` props — never show errors via separate `Typography` elements below a field
- Form layout: wrap fields in `Stack spacing={2}`
- Submit button: `Button variant="contained" fullWidth` at the bottom of the stack

```tsx
<Stack spacing={2} component="form" onSubmit={handleSubmit}>
  <TextField
    label="Email"
    name="email"
    type="email"
    required
    fullWidth
    error={!!errors.email}
    helperText={errors.email}
  />
  <Button type="submit" variant="contained" fullWidth>
    Sign In
  </Button>
</Stack>
```

### Buttons

| Variant | Usage |
|---|---|
| `contained` | Primary action (one per section) |
| `outlined` | Secondary / cancel actions |
| `text` | Tertiary, navigation links |

Always set a descriptive `aria-label` on icon-only buttons.

### Cards

All content surfaces use `Card` + `CardContent`. Never use `Paper` directly for content blocks — it lacks semantic structure.

```tsx
<Card variant="outlined">
  <CardContent>
    ...
  </CardContent>
</Card>
```

### Data tables

Use MUI `DataGrid` (from `@mui/x-data-grid`) for the transactions list — not `Table`. It handles sorting, filtering, pagination, and keyboard navigation out of the box.

### Charts

Use **MUI X Charts** (`@mui/x-charts`) for all data visualisation (bar charts, line charts, pie charts). Do not add a separate charting library.

### Loading states

Use MUI `Skeleton` for content placeholders — never show a blank space or a spinner in the middle of a page.

```tsx
{isLoading ? <Skeleton variant="rectangular" height={120} /> : <SummaryCard />}
```

### Empty states

Use a centered `Stack` with a MUI `SvgIcon`, `Typography` heading, and optional `Button` CTA. Never show blank space.

### Dialogs / Modals

Use `Dialog` + `DialogTitle` + `DialogContent` + `DialogActions`. Always include a close `IconButton` in `DialogTitle` for accessibility.

---

## Accessibility (a11y)

- All `IconButton` components must have an `aria-label`
- All images and icons that convey meaning must have `aria-label` or visible text equivalent; decorative icons use `aria-hidden="true"`
- Form inputs must always have an associated `label` (MUI `TextField` handles this via the `label` prop)
- Color must never be the sole means of conveying information (e.g. use icon + color for income/expense, not color alone)
- Focus must be visible at all times — never suppress MUI's default focus ring
- All interactive elements must be reachable via keyboard
- Use MUI `Tooltip` to expose meaning of icon-only controls to screen readers

---

## Notifications

Use MUI `Snackbar` + `Alert` for all user feedback (success, error, warning). Never use `alert()` or custom toast libraries.

```tsx
<Snackbar open={open} autoHideDuration={4000} onClose={handleClose}>
  <Alert severity="success" onClose={handleClose}>
    Transaction saved.
  </Alert>
</Snackbar>
```

---

## Do / Don't

| Do | Don't |
|---|---|
| Use `sx` prop for one-off style overrides | Write CSS classes or inline `style` |
| Use theme tokens via `sx={{ color: "primary.main" }}` | Hardcode `color: "#6366f1"` |
| Use `Stack` for vertical/horizontal layouts | Use `div` with flexbox styles |
| Use `Skeleton` while loading | Show blank content areas |
| Use `DataGrid` for tabular data | Build custom tables with `Table` + `TableRow` |
| Use `useTheme()` to read current mode | Use `window.matchMedia` or CSS media queries |
| Set `aria-label` on all icon buttons | Leave icon buttons unlabelled |
