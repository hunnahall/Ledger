import { describe, expect, it } from "vitest";
import { normalizeMerchant } from "./normalize-merchant";

// This has to stay byte-identical in behaviour to the copy the simplefin-sync
// edge function carries (supabase/functions/simplefin-sync/merchant.ts) —
// vendor rules are matched against whatever it produces, so a divergence
// would silently stop rules firing on synced transactions.
describe("normalizeMerchant", () => {
  it("lowercases and collapses punctuation to single spaces", () => {
    expect(normalizeMerchant("TARGET  #1234-STORE")).toBe("target store");
  });

  it("drops purely numeric tokens", () => {
    expect(normalizeMerchant("SQ *COFFEE 8829 4471")).toBe("sq coffee");
  });

  it("keeps alphanumeric tokens that merely contain digits", () => {
    expect(normalizeMerchant("SHELL OIL 7-ELEVEN A1")).toBe("shell oil eleven a1");
  });

  it("returns an empty string when nothing survives normalization", () => {
    expect(normalizeMerchant("*** 123 ###")).toBe("");
    expect(normalizeMerchant("   ")).toBe("");
  });
});
