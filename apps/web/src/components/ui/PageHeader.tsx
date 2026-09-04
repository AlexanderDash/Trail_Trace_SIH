import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-intel">{eyebrow}</p>
        ) : null}
        <h1 className="text-2xl font-semibold text-ink-900 dark:text-ink-50">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-500 dark:text-ink-300">{description}</p>
      </div>
      {actions}
    </header>
  );
}
