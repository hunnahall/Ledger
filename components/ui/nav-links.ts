import {
  DashboardIcon,
  TransactionsIcon,
  AccountsIcon,
  BudgetsIcon,
  SourcesIcon,
  ForecastIcon,
  LogIcon,
  SettingsIcon,
} from "./icons";

export const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/transactions", label: "Transactions", icon: TransactionsIcon },
  { href: "/budget", label: "Budget", icon: BudgetsIcon },
  { href: "/sources", label: "Sources", icon: SourcesIcon },
  { href: "/forecast", label: "Forecast", icon: ForecastIcon },
  { href: "/log", label: "Log", icon: LogIcon },
  { href: "/accounts", label: "Accounts", icon: AccountsIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;
