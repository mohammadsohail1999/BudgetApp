import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline";
  fullWidth?: boolean;
}

export default function Button({
  variant = "primary",
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

  const variants = {
    primary:
      "bg-violet-600 text-white hover:bg-violet-700 focus:ring-violet-500 dark:bg-violet-500 dark:hover:bg-violet-600",
    outline:
      "border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:ring-zinc-400",
  };

  return (
    <button
      className={[base, variants[variant], fullWidth ? "w-full" : "", className]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
