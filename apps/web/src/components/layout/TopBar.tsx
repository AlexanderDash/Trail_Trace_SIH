import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export function TopBar({ apiLabel }: { apiLabel: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex h-14 items-center justify-between border-b border-ink-200 bg-white/90 px-5 backdrop-blur dark:border-ink-800 dark:bg-ink-950/90">
      <div>
        <p className="text-sm font-medium text-ink-800 dark:text-ink-100">Financial intelligence operations</p>
        <p className="font-mono text-[11px] text-ink-400">{apiLabel}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden rounded-full border border-ink-200 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-ink-500 dark:border-ink-700 dark:text-ink-300 sm:inline">
          Investigator view
        </span>
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg border border-ink-200 p-2 text-ink-600 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800"
          aria-label="Toggle color theme"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
