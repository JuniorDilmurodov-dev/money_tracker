import type { ReactNode } from "react";
import { formatPercentChange, formatSom } from "@/lib/money";

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-surface-1 p-4 sm:p-5 ${className}`}
    >
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <h2 className="text-sm font-medium tracking-wide text-ink-2">{title}</h2>
          )}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/**
 * A headline number with its comparison. The delta carries an arrow and the
 * words "vs …" so the meaning never rests on color alone.
 */
export function StatTile({
  label,
  value,
  delta,
  deltaLabel,
}: {
  label: string;
  value: number;
  delta?: number | null;
  deltaLabel?: string;
}) {
  const hasDelta = delta !== undefined;
  const up = (delta ?? 0) > 0;
  const flat = delta === null || delta === 0;

  return (
    <div className="rounded-xl border border-line bg-surface-2 px-4 py-3">
      <div className="text-xs text-ink-3">{label}</div>
      <div className="tnum mt-1 text-2xl font-semibold sm:text-3xl">{formatSom(value)}</div>
      {hasDelta && (
        <div className="mt-1 flex items-baseline gap-1.5 text-xs">
          <span
            className="tnum font-medium"
            style={{ color: flat ? "var(--text-secondary)" : up ? "var(--danger)" : "var(--good)" }}
          >
            {flat ? "" : up ? "↑ " : "↓ "}
            {formatPercentChange(delta ?? null)}
          </span>
          {deltaLabel && <span className="text-ink-3">{deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-2 ${className}`} />;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="py-8 text-center text-sm text-ink-3">{children}</p>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm" style={{ color: "var(--danger)" }}>
      {children}
    </p>
  );
}
