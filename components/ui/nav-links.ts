import {
  DashboardIcon,
  TransactionsIcon,
  AccountsIcon,
  BudgetIcon,
  SourcesIcon,
  ForecastIcon,
  LogIcon,
  RulesIcon,
  SettingsIcon,
} from "./icons";

export const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  // badge: shows how many transactions still need a Source.
  { href: "/transactions", label: "Transactions", icon: TransactionsIcon, badge: "review" },
  { href: "/budget", label: "Budget", icon: BudgetIcon },
  { href: "/sources", label: "Sources", icon: SourcesIcon },
  { href: "/accounts", label: "Accounts", icon: AccountsIcon },
  { href: "/forecasts", label: "Forecasts", icon: ForecastIcon },
] as const;

// Reached through the "..." menu at the bottom of the navigation.
export const MORE_LINKS = [
  { href: "/log", label: "Log", icon: LogIcon },
  { href: "/rules", label: "Rules", icon: RulesIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export const ALL_LINKS = [...NAV_LINKS, ...MORE_LINKS];
export type NavLinkItem = (typeof ALL_LINKS)[number];
