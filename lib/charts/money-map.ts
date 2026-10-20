// The Dashboard's money map: one bar split by what each Source holds. It
// reads Source balances only. It used to compare them with account balances
// (unassigned cash), but most people don't connect every account, so that
// comparison was off by whatever lived in the accounts Ledger can't see.

import { orderSources, sourceTones, type ChartTone } from "@/lib/charts/source-tones";

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
  /** Every live Source balance added up, negatives included. */
  total: number;
  /** Positive Source balances in stable order, Other last. */
  segments: MoneyMapSegment[];
  /** Sources below zero: listed under the bar, never drawn. */
  negatives: { id: string; name: string; amount: number }[];
};

const cents = (n: number) => Math.round(n * 100) / 100;

export function computeMoneyMap({ sources }: { sources: MoneyMapSource[] }): MoneyMap {
  const live = orderSources(sources.filter((s) => !s.archived));
  const tones = sourceTones(live);

  const positive = live.filter((s) => s.balance > 0);
  const own = positive.filter((s) => tones.get(s.id) !== null);
  const rest = positive.filter((s) => tones.get(s.id) === null);
  const positiveTotal = positive.reduce((sum, s) => sum + s.balance, 0);
  const share = (amount: number) => (positiveTotal > 0 ? amount / positiveTotal : 0);

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
    total: cents(live.reduce((sum, s) => sum + s.balance, 0)),
    segments,
    negatives: live
      .filter((s) => s.balance < 0)
      .map((s) => ({ id: s.id, name: s.name, amount: cents(s.balance) })),
  };
}
