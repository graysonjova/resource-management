import clsx from "clsx";
import type { ReactNode } from "react";

export type Accent =
  | "yellow"
  | "ink"
  | "gray"
  | "success"
  | "warning"
  | "danger";

const ACCENT_TEXT: Record<Accent, string> = {
  yellow: "text-ey-black",
  ink: "text-ey-ink",
  gray: "text-ey-gray",
  success: "text-state-success",
  warning: "text-state-warning",
  danger: "text-state-danger",
};

const ACCENT_BG: Record<Accent, string> = {
  yellow: "bg-ey-yellow",
  ink: "bg-ey-ink",
  gray: "bg-ey-gray-200",
  success: "bg-state-success",
  warning: "bg-state-warning",
  danger: "bg-state-danger",
};

export function Panel({
  children,
  className,
  hover,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={clsx("panel p-4", hover && "panel-hover", className)}>
      {children}
    </div>
  );
}

export function PanelTitle({
  children,
  accent = "yellow",
}: {
  children: ReactNode;
  accent?: Accent;
}) {
  return (
    <h3 className="mb-3 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.14em] text-ey-black">
      <span className={clsx("h-3.5 w-1 rounded-sm", ACCENT_BG[accent])} />
      {children}
    </h3>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent = "yellow",
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: Accent;
  icon?: ReactNode;
}) {
  return (
    <div className="panel panel-hover relative flex flex-col gap-1 overflow-hidden p-4">
      <span
        className={clsx(
          "absolute inset-x-0 top-0 h-1",
          ACCENT_BG[accent],
        )}
      />
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-ey-gray">
          {label}
        </span>
        <span className={ACCENT_TEXT[accent]}>{icon}</span>
      </div>
      <span className="font-display text-3xl font-bold text-ey-black">
        {value}
      </span>
      {sub && <span className="text-xs text-ey-gray">{sub}</span>}
    </div>
  );
}

export function Chip({
  children,
  color = "gray",
}: {
  children: ReactNode;
  color?: Accent;
}) {
  const map: Record<Accent, string> = {
    yellow: "border-ey-yellow bg-ey-yellow/30 text-ey-black",
    ink: "border-ey-ink/25 bg-ey-ink/5 text-ey-ink",
    gray: "border-ey-gray-200 bg-ey-offwhite text-ey-gray",
    success: "border-state-success/30 bg-state-success/10 text-state-success",
    warning: "border-state-warning/30 bg-state-warning/10 text-state-warning",
    danger: "border-state-danger/30 bg-state-danger/10 text-state-danger",
  };
  return <span className={clsx("chip", map[color])}>{children}</span>;
}

export function CapacityBar({ available }: { available: number }) {
  const freePct = Math.round(available * 100);
  const color =
    freePct === 0
      ? "#B8202E"
      : freePct >= 75
        ? "#168736"
        : freePct >= 40
          ? "#FFE600"
          : "#B35C00";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-ey-gray-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${freePct}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-9 text-right text-xs font-semibold text-ey-ink">
        {freePct}%
      </span>
    </div>
  );
}
