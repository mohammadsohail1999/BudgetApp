/**
 * Default categories seeded for every new user on signup.
 * Stored per-user in the `categories` collection — fully isolated,
 * no shared global categories between users.
 */

export interface DefaultCategoryTemplate {
  name: string;
  type: "income" | "expense" | "both";
  color: string; // 6-digit hex
  icon: string; // icon slug used by the UI
  isDefault: true;
}

export const DEFAULT_CATEGORIES: DefaultCategoryTemplate[] = [
  // Income
  {
    name: "Salary",
    type: "income",
    color: "#22c55e",
    icon: "briefcase",
    isDefault: true,
  },
  {
    name: "Freelance",
    type: "income",
    color: "#10b981",
    icon: "laptop",
    isDefault: true,
  },
  {
    name: "Investment",
    type: "income",
    color: "#6366f1",
    icon: "trending-up",
    isDefault: true,
  },
  // Expense
  {
    name: "Food",
    type: "expense",
    color: "#f97316",
    icon: "utensils",
    isDefault: true,
  },
  {
    name: "Transport",
    type: "expense",
    color: "#3b82f6",
    icon: "car",
    isDefault: true,
  },
  {
    name: "Housing",
    type: "expense",
    color: "#8b5cf6",
    icon: "home",
    isDefault: true,
  },
  {
    name: "Health",
    type: "expense",
    color: "#ec4899",
    icon: "heart",
    isDefault: true,
  },
  {
    name: "Shopping",
    type: "expense",
    color: "#f59e0b",
    icon: "shopping-cart",
    isDefault: true,
  },
  {
    name: "Entertainment",
    type: "expense",
    color: "#14b8a6",
    icon: "film",
    isDefault: true,
  },
  {
    name: "Education",
    type: "expense",
    color: "#0ea5e9",
    icon: "book",
    isDefault: true,
  },
  // Both
  {
    name: "Other",
    type: "both",
    color: "#71717a",
    icon: "more-horizontal",
    isDefault: true,
  },
];
