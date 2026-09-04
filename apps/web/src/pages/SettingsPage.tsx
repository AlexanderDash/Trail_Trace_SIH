import { useEffect, useState } from "react";
import type { SystemInfo } from "@trailtrace/shared";
import { api } from "../lib/api";
import { Badge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { useTheme } from "../context/ThemeContext";

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const [info, setInfo] = useState<SystemInfo | null>(null);

  useEffect(() => {
    api.system().then(setInfo).catch(() => setInfo(null));
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Workbench"
        title="Settings"
        description="Local investigator preferences and system constraints. No production credentials are stored in this prototype."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-400">Appearance</h2>
          <p className="mt-2 text-sm text-ink-500">Theme is stored in this browser only.</p>
          <button
            type="button"
            onClick={toggleTheme}
            className="mt-4 rounded-lg bg-ink-900 px-4 py-2 text-sm text-white dark:bg-intel dark:text-ink-950"
          >
            Switch to {theme === "dark" ? "light" : "dark"} mode
          </button>
        </Panel>
        <Panel>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-400">System</h2>
          {info ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Problem</dt>
                <dd className="font-mono">{info.problemStatement}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">ATM control</dt>
                <dd>
                  <Badge tone="neutral">Disabled</Badge>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Transaction blocking</dt>
                <dd>
                  <Badge tone="neutral">Disabled</Badge>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Database</dt>
                <dd className="text-right text-ink-700 dark:text-ink-200">{info.architecture.database}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-ink-500">System metadata unavailable until the API is running.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
