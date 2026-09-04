import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { api } from "../../lib/api";
import { StatusBanner } from "../ui/StatusBanner";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  const [apiLabel, setApiLabel] = useState("API status: checking…");

  useEffect(() => {
    api
      .health()
      .then((health) => {
        setApiLabel(`API ${health.status} · database ${health.database} · v${health.version}`);
      })
      .catch(() => {
        setApiLabel("API unreachable — start apps/api");
      });
  }, []);

  return (
    <div className="flex min-h-screen bg-ink-50 dark:bg-ink-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <StatusBanner />
        <TopBar apiLabel={apiLabel} />
        <main className="grid-overlay flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
