import { describe, expect, it } from "vitest";
import { orderSources, sourceTones } from "./source-tones";

const src = (id: string, type: string, isSystem: boolean, createdAt: string) => ({ id, type, isSystem, createdAt });

describe("sourceTones", () => {
  const sources = [
    src("car", "fund", false, "2026-01-02"),
    src("float", "float", true, "2026-01-01"),
    src("budget", "budget", true, "2026-01-01"),
    src("trip", "fund", false, "2026-01-01"),
    src("income", "income", true, "2026-01-01"),
    src("sink", "sinking_fund", true, "2026-01-01"),
    src("gifts", "fund", false, "2026-02-01"),
    src("pets", "fund", false, "2026-03-01"),
    src("home", "fund", false, "2026-04-01"),
    src("kids", "fund", false, "2026-05-01"),
  ];

  it("puts system Sources first in a fixed order, then the rest oldest first", () => {
    expect(orderSources(sources).map((s) => s.id)).toEqual([
      "budget",
      "income",
      "sink",
      "float",
      "trip",
      "car",
      "gifts",
      "pets",
      "home",
      "kids",
    ]);
  });

  it("gives the first eight a tone and groups the rest", () => {
    const tones = sourceTones(sources);
    expect(tones.get("budget")).toBe(1);
    expect(tones.get("car")).toBe(6);
    expect(tones.get("pets")).toBe(8);
    expect(tones.get("home")).toBeNull();
    expect(tones.get("kids")).toBeNull();
  });

  it("doesn't depend on input order", () => {
    expect(sourceTones([...sources].reverse()).get("trip")).toBe(5);
  });
});
