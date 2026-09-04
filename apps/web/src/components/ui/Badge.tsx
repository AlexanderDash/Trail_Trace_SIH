import { cn } from "../../lib/cn";

type BadgeProps = {
  children: string;
  tone?: "neutral" | "intel" | "warning" | "danger";
};

const tones = {
  neutral: "border-ink-300 text-ink-500 dark:border-ink-600 dark:text-ink-300",
  intel: "border-intel/40 bg-intel/10 text-intel-dim dark:text-intel",
  warning: "border-signal-amber/40 bg-signal-amber/10 text-signal-amber",
  danger: "border-signal-rose/40 bg-signal-rose/10 text-signal-rose",
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span className={cn("inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider", tones[tone])}>
      {children}
    </span>
  );
}
