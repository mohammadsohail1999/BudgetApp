import { ReactNode } from "react";
import Link from "next/link";

interface AuthCardProps {
  title: string;
  subtitle: string;
  footerText: string;
  footerLinkLabel: string;
  footerLinkHref: string;
  children: ReactNode;
}

export default function AuthCard({
  title,
  subtitle,
  footerText,
  footerLinkLabel,
  footerLinkHref,
  children,
}: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 dark:bg-violet-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-white"
              aria-hidden="true"
            >
              <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
              <path d="M21.18 8H12V2.82A10 10 0 0 1 21.18 8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white px-8 py-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {footerText}{" "}
          <Link
            href={footerLinkHref}
            className="font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
          >
            {footerLinkLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
