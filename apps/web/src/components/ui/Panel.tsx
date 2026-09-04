import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-ink-200 bg-white p-5 dark:border-ink-700/70 dark:bg-ink-900/80", className)}>
      {children}
    </section>
  );
}
