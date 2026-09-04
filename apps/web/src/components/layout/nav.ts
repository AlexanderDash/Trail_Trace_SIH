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
  { to: "/transactions", label: "Transactions", icon: Wallet },
  { to: "/trails", label: "Trails", icon: GitBranch, ready: true },
  { to: "/accounts", label: "Accounts", icon: Users, ready: true },
  { to: "/watchlist", label: "Watchlist", icon: ShieldAlert, ready: true },
  { to: "/geospatial", label: "Map Intelligence", icon: Map, ready: true },
  { to: "/alerts", label: "Alerts", icon: Bell, ready: true },
  { to: "/investigations", label: "Investigations", icon: Briefcase, ready: true },
  { to: "/intelligence", label: "Intelligence", icon: Network, ready: true },
  { to: "/reports", label: "Reports", icon: ScrollText },
  { to: "/data-sources", label: "Data Sources", icon: Database, ready: true },
  { to: "/settings", label: "Settings", icon: Settings, ready: true },
];

export const APP_NAV_META = {
  product: "TrailTrace",
  unit: "I4C-style intelligence workbench",
  problem: "SIH 26184",
};
