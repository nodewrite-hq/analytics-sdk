import { describe, expect, it } from "vitest";
import { acceptDurationSeconds } from "./duration-seconds.js";

describe("acceptDurationSeconds", () => {
  it("returns the value when it is from 0 to 1800 inclusive", () => {
    expect(acceptDurationSeconds(0)).toBe(0);
    expect(acceptDurationSeconds(1)).toBe(1);
    expect(acceptDurationSeconds(1.5)).toBe(1.5);
    expect(acceptDurationSeconds(900)).toBe(900);
    expect(acceptDurationSeconds(1800)).toBe(1800);
  });

  it("returns null when the value is below 0 or above 1800", () => {
    expect(acceptDurationSeconds(-0.01)).toBeNull();
    expect(acceptDurationSeconds(-1)).toBeNull();
    expect(acceptDurationSeconds(1800.1)).toBeNull();
    expect(acceptDurationSeconds(1801)).toBeNull();
    expect(acceptDurationSeconds(Number.NaN)).toBeNull();
    expect(acceptDurationSeconds(Number.POSITIVE_INFINITY)).toBeNull();
    expect(acceptDurationSeconds(Number.NEGATIVE_INFINITY)).toBeNull();
  });
});
