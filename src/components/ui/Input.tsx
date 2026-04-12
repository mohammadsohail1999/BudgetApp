import { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  labelSuffix?: ReactNode;
  error?: string;
  id: string;
}

export default function Input({
  label,
  labelSuffix,
  error,
  id,
  className,
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {label}
        </label>
        {labelSuffix}
      </div>
      <input
        id={id}
        className={[
          "h-10 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors",
          "bg-white dark:bg-zinc-900",
          "text-zinc-900 dark:text-zinc-100",
          "placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
          error
            ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900"
            : "border-zinc-300 dark:border-zinc-700 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-900",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <p
          id={`${id}-error`}
          className="text-xs text-red-500 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}
