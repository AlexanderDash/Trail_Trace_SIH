import { NavLink } from "react-router-dom";
import { APP_NAV_META, NAV_ITEMS } from "./nav";
import { cn } from "../../lib/cn";

export function Sidebar() {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-950">
      <div className="border-b border-ink-200 px-5 py-5 dark:border-ink-800">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-intel">{APP_NAV_META.problem}</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-ink-900 dark:text-white">{APP_NAV_META.product}</h1>
        <p className="mt-1 text-xs leading-5 text-ink-500 dark:text-ink-400">{APP_NAV_META.unit}</p>
      </div>
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                isActive
                  ? "bg-ink-900 text-white dark:bg-ink-800"
                  : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-900",
              )
            }
          >
            <item.icon size={16} />
            <span className="flex-1">{item.label}</span>
            {!item.ready ? (
              <span className="font-mono text-[9px] uppercase tracking-wider text-ink-400">Soon</span>
            ) : null}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
