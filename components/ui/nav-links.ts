import {
  DashboardIcon,
  TransactionsIcon,
  AccountsIcon,
  BudgetsIcon,
  SourcesIcon,
  SettingsIcon,
} from "./icons";

export const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/transactions", label: "Transactions", icon: TransactionsIcon },
  { href: "/accounts", label: "Accounts", icon: AccountsIcon },
  { href: "/budgets", label: "Budgets", icon: BudgetsIcon },
  { href: "/sources", label: "Sources", icon: SourcesIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;
