import { describe, expect, it } from "vitest";
import { decodeBucketOption, encodeBucketOption } from "./bucket-option";

describe("encodeBucketOption / decodeBucketOption", () => {
  it("round-trips a source option", () => {
    const option = { type: "source" as const, id: "abc-123" };
    expect(decodeBucketOption(encodeBucketOption(option))).toEqual(option);
  });

  it("round-trips a fund option", () => {
    const option = { type: "fund" as const, id: "def-456" };
    expect(decodeBucketOption(encodeBucketOption(option))).toEqual(option);
  });

  it("encodes null as an empty string", () => {
    expect(encodeBucketOption(null)).toBe("");
  });

  it("decodes empty, missing, or malformed values as null", () => {
    expect(decodeBucketOption("")).toBeNull();
    expect(decodeBucketOption(null)).toBeNull();
    expect(decodeBucketOption("nonsense")).toBeNull();
  });
});
