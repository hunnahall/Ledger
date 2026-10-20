// The Dashboard's money map: one bar of cash split by the Sources that hold
// it. unassigned = cash - assigned, the same figure Safe to Spend uses
// (lib/accounts/unassigned-cash.ts). It should be 0: every dollar in a Source.

import { orderSources, sourceTones, type ChartTone } from "@/lib/charts/source-tones";

export type MoneyMapAccount = { balance: number; includeInCash: boolean };

export type MoneyMapSource = {
  id: string;
  name: string;
  type: string | null;
  isSystem: boolean;
  createdAt: string;
  balance: number;
  archived?: boolean;
};

export type MoneyMapSegment = {
  /** A Source id, or "other" for Sources past the sixth color. */
  id: string;
  name: string;
  amount: number;
  /** Share of the bar's width (0-1). */
  share: number;
  tone: ChartTone | null;
};

export type MoneyMap = {
  /** No accounts at all: nothing to map yet. */
  empty: boolean;
  cash: number;
  assigned: number;
  unassigned: number;
  /** exact: every dollar is in a Source. under: cash no Source holds. over: Sources hold more than the accounts. */
  status: "exact" | "under" | "over";
  /** Positive Source balances in stable order, Other last. */
  segments: MoneyMapSegment[];
  /** Share of the bar the unassigned segment takes (under only). */
  unassignedShare: number;
  /** Where cash ends along the bar (0-1), drawn as a tick when over; null otherwise. */
  cashMark: number | null;
  /** Sources below zero: listed under the bar, never drawn. */
  negatives: { id: string; name: string; amount: number }[];
};

const cents = (n: number) => Math.round(n * 100) / 100;

export function computeMoneyMap({
  accounts,
  sources,
}: {
  accounts: MoneyMapAccount[];
  sources: MoneyMapSource[];
}): MoneyMap {
  const live = orderSources(sources.filter((s) => !s.archived));
  const tones = sourceTones(live);

  const cash = cents(accounts.reduce((sum, a) => (a.includeInCash ? sum + a.balance : sum), 0));
  const assigned = cents(live.reduce((sum, s) => sum + s.balance, 0));
  const unassigned = cents(cash - assigned);
  const status = Math.abs(unassigned) < 0.005 ? "exact" : unassigned > 0 ? "under" : "over";

  const positive = live.filter((s) => s.balance > 0);
  const own = positive.filter((s) => tones.get(s.id) !== null);
  const rest = positive.filter((s) => tones.get(s.id) === null);
  const positiveTotal = positive.reduce((sum, s) => sum + s.balance, 0);
  const unassignedWidth = status === "under" ? unassigned : 0;
  const scale = Math.max(positiveTotal + unassignedWidth, cash, 0);
  const share = (amount: number) => (scale > 0 ? amount / scale : 0);

  const segments: MoneyMapSegment[] = own.map((s) => ({
    id: s.id,
    name: s.name,
    amount: cents(s.balance),
    share: share(s.balance),
    tone: tones.get(s.id) ?? null,
  }));
  if (rest.length > 0) {
    const restTotal = cents(rest.reduce((sum, s) => sum + s.balance, 0));
    segments.push({ id: "other", name: "Other", amount: restTotal, share: share(restTotal), tone: null });
  }

  return {
    empty: accounts.length === 0,
    cash,
    assigned,
    unassigned,
    status,
    segments,
    unassignedShare: share(unassignedWidth),
    cashMark: status === "over" ? Math.min(1, Math.max(0, share(cash))) : null,
    negatives: live
      .filter((s) => s.balance < 0)
      .map((s) => ({ id: s.id, name: s.name, amount: cents(s.balance) })),
  };
}
