import { ModulePlaceholder } from "../components/ui/ModulePlaceholder";

export function ReportsPage() {
  return (
    <ModulePlaceholder
      title="Reports"
      description="Analyst-facing summaries of trails, risk, and geographic concentrations. Not operational government statistics."
      planned={[
        "Trail narrative reports",
        "Watchlist activity digest",
        "Geographic concentration notes",
        "Export in a later stage",
      ]}
    />
  );
}
