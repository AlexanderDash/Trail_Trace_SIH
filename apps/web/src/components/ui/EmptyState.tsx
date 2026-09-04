import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-4 rounded-full border border-ink-200 p-3 text-ink-400 dark:border-ink-700">
        <Icon size={22} />
      </span>
      <h2 className="text-base font-semibold text-ink-800 dark:text-ink-100">{title}</h2>
      <p className="mt-2 max-w-lg text-sm leading-6 text-ink-500 dark:text-ink-400">{body}</p>
    </div>
  );
}
