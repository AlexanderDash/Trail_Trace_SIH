import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AccountsPage } from "./pages/AccountsPage";
import { AlertsPage } from "./pages/AlertsPage";
import { ComplaintsPage } from "./pages/ComplaintsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DataSourcesPage } from "./pages/DataSourcesPage";
import { InvestigationsPage } from "./pages/InvestigationsPage";
import { GeospatialPage } from "./pages/GeospatialPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TrailsPage } from "./pages/TrailsPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { WatchlistPage } from "./pages/WatchlistPage";
import { InvestigationWorkspacePage } from "./pages/InvestigationWorkspacePage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="complaints" element={<ComplaintsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="trails" element={<TrailsPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="watchlist" element={<WatchlistPage />} />
        <Route path="geospatial" element={<GeospatialPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="investigations" element={<InvestigationsPage />} />
        <Route path="investigations/:id" element={<InvestigationWorkspacePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="data-sources" element={<DataSourcesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
