import { Moon, Sun, Search as SearchIcon, RotateCcw } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useState } from "react";

export function TopBar({ apiLabel }: { apiLabel: string }) {
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/v1/intelligence/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearMemory = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all memory?\n\nThis will remove all uploaded bank data, complaints, accounts, trails, and investigations so you can start 100% fresh from the beginning."
    );
    if (!confirmed) return;

    setIsClearing(true);
    try {
      const res = await fetch("/api/v1/system/clear-memory", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      window.location.href = "/data-sources";
    } catch (err: any) {
      alert(`Failed to clear memory: ${err.message}`);
      setIsClearing(false);
    }
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-ink-200 bg-white/90 px-5 backdrop-blur dark:border-ink-800 dark:bg-ink-950/90 z-20 relative">
      <div>
        <p className="text-sm font-medium text-ink-800 dark:text-ink-100">Financial intelligence operations</p>
        <p className="font-mono text-[11px] text-ink-400">{apiLabel}</p>
      </div>

      {/* Global Search */}
      <div className="relative hidden md:block w-96">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input
            type="text"
            value={query}
            onChange={handleSearch}
            placeholder="Search accounts, complaints, investigations..."
            className="w-full rounded-md border border-ink-200 dark:border-ink-700 bg-ink-50 dark:bg-ink-900/50 py-1.5 pl-9 pr-4 text-sm text-ink-900 dark:text-ink-100 focus:border-intel focus:outline-none focus:ring-1 focus:ring-intel"
          />
        </div>
        {query.length >= 2 && (
          <div className="absolute top-full left-0 mt-1 w-full rounded-md border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-lg py-2 z-50">
             {isSearching ? (
               <div className="px-4 py-2 text-xs text-ink-500">Searching...</div>
             ) : results.length > 0 ? (
               results.map(r => (
                 <a key={r.id} href={r.link} className="flex items-center justify-between px-4 py-2 hover:bg-ink-50 dark:hover:bg-ink-800">
                   <span className="text-sm font-medium">{r.title}</span>
                   <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-ink-100 dark:bg-ink-800 text-ink-500">{r.type}</span>
                 </a>
               ))
             ) : (
               <div className="px-4 py-2 text-xs text-ink-500">No results found for "{query}"</div>
             )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleClearMemory}
          disabled={isClearing}
          className="flex items-center gap-1.5 rounded-lg border border-signal-rose/40 bg-signal-rose/10 px-3 py-1.5 text-xs font-medium text-signal-rose hover:bg-signal-rose/20 transition-colors disabled:opacity-50"
          title="Wipe all uploaded bank data, complaints, trails, and accounts to start fresh"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${isClearing ? "animate-spin" : ""}`} />
          <span>{isClearing ? "Clearing..." : "Clear Memory"}</span>
        </button>

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
