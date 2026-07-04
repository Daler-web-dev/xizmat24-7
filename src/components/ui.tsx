"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-tg-hint">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-tg-hint/30 border-t-tg-link" />
      {label ? <span className="text-sm">{label}</span> : null}
    </div>
  );
}

/** Full-screen centered message (used for auth/empty/error states). */
export function StateScreen({
  emoji,
  title,
  subtitle,
  action,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-center">
      <div className="text-5xl">{emoji}</div>
      <h1 className="text-lg font-semibold">{title}</h1>
      {subtitle ? <p className="max-w-xs text-sm text-tg-hint">{subtitle}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "destructive";
  block?: boolean;
};

export function Button({
  variant = "primary",
  block,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition active:opacity-80 disabled:opacity-50 disabled:pointer-events-none";
  const variants: Record<string, string> = {
    primary: "bg-tg-button text-tg-buttonText",
    secondary: "bg-tg-secondaryBg text-tg-text",
    destructive: "bg-tg-secondaryBg text-tg-destructive",
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-tg-destructive">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-tg-hint">{hint}</span>
      ) : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-tg-hint/20 bg-tg-secondaryBg px-3 py-3 text-base outline-none focus:border-tg-link";
