import { describe, expect, it } from "vitest";
import { AnalyticsPeriod, analyticsPeriodRange, assertTimeZone, isAnalyticsPeriod } from "./period.js";

describe("analyticsPeriodRange", () => {
  it("counts the last 7 days from the zone's midnight, today included", () => {
    const now = new Date("2026-10-31T10:15:00.000Z");
    const range = analyticsPeriodRange(AnalyticsPeriod.LAST_7_DAYS, now, "Europe/Podgorica");

    expect(range.from).toBe("2026-10-24T22:00:00.000Z");
    expect(range.to).toBe("2026-10-31T10:15:00.000Z");
    expect(range.buckets).toHaveLength(7);
    expect(range.buckets.at(-1)).toEqual({
      start: "2026-10-30T23:00:00.000Z",
      end: "2026-10-31T23:00:00.000Z",
    });
  });

  it("gives the day of a daylight saving change its real length", () => {
    const now = new Date("2026-10-26T12:00:00.000Z");
    const range = analyticsPeriodRange(AnalyticsPeriod.LAST_7_DAYS, now, "Europe/Podgorica");
    const change = range.buckets.find((bucket) => bucket.start === "2026-10-24T22:00:00.000Z");

    expect(change?.end).toBe("2026-10-25T23:00:00.000Z");
  });

  it("uses hours for 24 hours and months for 12 months", () => {
    const now = new Date("2026-10-31T10:15:00.000Z");

    const hours = analyticsPeriodRange(AnalyticsPeriod.LAST_24_HOURS, now, "UTC");
    expect(hours.buckets).toHaveLength(24);
    expect(hours.from).toBe("2026-10-30T11:00:00.000Z");

    const months = analyticsPeriodRange(AnalyticsPeriod.LAST_12_MONTHS, now, "UTC");
    expect(months.buckets).toHaveLength(12);
    expect(months.from).toBe("2025-11-01T00:00:00.000Z");
    expect(months.buckets.at(-1)?.end).toBe("2026-11-01T00:00:00.000Z");
  });
});

describe("isAnalyticsPeriod", () => {
  it("accepts the listed periods only", () => {
    expect(isAnalyticsPeriod("30d")).toBe(true);
    expect(isAnalyticsPeriod("1y")).toBe(false);
    expect(isAnalyticsPeriod(undefined)).toBe(false);
  });
});

describe("assertTimeZone", () => {
  it("throws for an unknown time zone", () => {
    expect(() => assertTimeZone("Mars/Olympus")).toThrow(RangeError);
    expect(() => assertTimeZone("Europe/Podgorica")).not.toThrow();
  });
});
