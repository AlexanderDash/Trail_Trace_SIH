import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Briefcase,
  Database,
  FileText,
  GitBranch,
  LayoutDashboard,
  Map,
  ScrollText,
  Settings,
  ShieldAlert,
  Users,
  Wallet,
  Network
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  ready?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, ready: true },
  { to: "/complaints", label: "Complaints", icon: FileText, ready: true },
  { to: "/transactions", label: "Transactions", icon: Wallet, ready: true },
  { to: "/trails", label: "Trails", icon: GitBranch, ready: true },
  { to: "/intelligence", label: "Interdiction & DNA", icon: Network, ready: true },
  { to: "/geospatial", label: "STKDE Risk Surface", icon: Map, ready: true },
  { to: "/accounts", label: "Accounts", icon: Users, ready: true },
  { to: "/watchlist", label: "Watchlist", icon: ShieldAlert, ready: true },
  { to: "/alerts", label: "Evidence Alerts", icon: Bell, ready: true },
  { to: "/investigations", label: "Investigations", icon: Briefcase, ready: true },
  { to: "/reports", label: "Reports", icon: ScrollText, ready: true },
  { to: "/data-sources", label: "Data Sources", icon: Database, ready: true },
  { to: "/settings", label: "Settings", icon: Settings, ready: true },
];

export const APP_NAV_META = {
  product: "ANVESH",
  unit: "Predictive Interdiction | Team THE INVERSION",
  problem: "SIH 26184 — Cybercrime Intervention",
};

