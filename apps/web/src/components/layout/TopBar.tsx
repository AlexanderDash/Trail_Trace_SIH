import { Moon, Sun, Search as SearchIcon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useState } from "react";

export function TopBar({ apiLabel }: { apiLabel: string }) {
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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
