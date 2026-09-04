import { ShieldAlert } from "lucide-react";

export function StatusBanner() {
  return (
    <div className="flex items-start gap-3 border-b border-signal-amber/30 bg-signal-amber/10 px-4 py-2.5 text-sm text-ink-800 dark:text-ink-100">
      <ShieldAlert className="mt-0.5 shrink-0 text-signal-amber" size={16} />
      <p>
        <span className="font-semibold">SYNTHETIC DEMO</span>
        {" — "}
        SIH 26184 prototype. All data is fictional. TrailTrace does not control ATMs, reject withdrawals, or block bank
        transactions.
      </p>
    </div>
  );
}
