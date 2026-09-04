import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

type StatCardProps = {
  label: string;
  value: string | number;
  hint: string;
  icon: LucideIcon;
  tone?: "default" | "warning" | "danger" | "intel";
};

const toneClass: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-signal-blue",
  intel: "text-intel",
  warning: "text-signal-amber",
  danger: "text-signal-rose",
};

export function StatCard({ label, value, hint, icon: Icon, tone = "default" }: StatCardProps) {
  return (
    <article className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm dark:border-ink-700/70 dark:bg-ink-900/80 dark:shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-400">{label}</p>
          <p className="mt-2 font-mono text-3xl font-medium text-ink-900 dark:text-ink-50">{value}</p>
        </div>
        <span className={cn("rounded-lg bg-ink-100 p-2 dark:bg-ink-800/80", toneClass[tone])}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-ink-500 dark:text-ink-400">{hint}</p>
    </article>
  );
}
