import {
  Plus,
  ChevronDown,
  ChevronRight,
  Check,
  Share2,
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  PieChart,
  Layers,
  Settings,
  LogOut,
  Search,
  RefreshCw,
  Split,
  TrendingUp,
  ScrollText,
  ListFilter,
  Ellipsis,
  Menu,
  X,
  GripVertical,
  EyeOff,
  LayoutGrid,
  ChevronsLeftRight,
  type LucideProps,
} from "lucide-react";

// Lucide at a 1.5 stroke, outline only (Covenant Works design system v2).
// 16px in controls and navigation, 20px in page headers.
type IconProps = { size?: number; className?: string };

function make(Icon: React.ComponentType<LucideProps>) {
  return function LedgerIcon({ size = 16, className }: IconProps) {
    return <Icon size={size} strokeWidth={1.5} className={className} aria-hidden="true" />;
  };
}

export const AddIcon = make(Plus);
export const ChevronDownIcon = make(ChevronDown);
export const ChevronRightIcon = make(ChevronRight);
export const CheckIcon = make(Check);
export const ShareIcon = make(Share2);
export const DashboardIcon = make(LayoutDashboard);
export const TransactionsIcon = make(ArrowLeftRight);
export const AccountsIcon = make(Landmark);
export const BudgetIcon = make(PieChart);
export const SourcesIcon = make(Layers);
export const SettingsIcon = make(Settings);
export const LogOutIcon = make(LogOut);
export const SearchIcon = make(Search);
export const RefreshIcon = make(RefreshCw);
export const SplitIcon = make(Split);
export const ForecastIcon = make(TrendingUp);
export const LogIcon = make(ScrollText);
export const RulesIcon = make(ListFilter);
export const MoreIcon = make(Ellipsis);
export const MenuIcon = make(Menu);
export const CloseIcon = make(X);
export const GripIcon = make(GripVertical);
export const HideIcon = make(EyeOff);
export const LayoutIcon = make(LayoutGrid);
export const ResizeIcon = make(ChevronsLeftRight);
