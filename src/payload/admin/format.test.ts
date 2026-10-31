import { describe, expect, it } from "vitest";
import { AnalyticsBucketUnit } from "../../core/period.js";
import { reportFormat, resolveFormatLocale } from "./format.js";

describe("resolveFormatLocale", () => {
  it("prefers the host's tag, then Payload's date locale, then English", () => {
    expect(resolveFormatLocale("rs-latin", "rs-Latin", { "rs-latin": "sr-Latn" })).toBe("sr-Latn");
    expect(resolveFormatLocale("de", "de", {})).toBe("de");
    expect(resolveFormatLocale("xx-made-up", undefined, {})).toBe("en");
  });
});

describe("reportFormat", () => {
  it("names countries and formats durations in the admin's language", () => {
    const serbian = reportFormat("sr-Latn", "Europe/Podgorica", AnalyticsBucketUnit.DAY);
    expect(serbian.country("ME")).toBe("Crna Gora");

    const english = reportFormat("en", "UTC", AnalyticsBucketUnit.DAY);
    expect(english.country("ME")).toBe("Montenegro");
    expect(english.duration(42)).toBe("42 sec");
    expect(english.duration(125)).toBe("2 min 5 sec");
    expect(english.number(1234)).toBe("1,234");
  });

  it("labels chart steps in the report's time zone", () => {
    const days = reportFormat("en", "Europe/Podgorica", AnalyticsBucketUnit.DAY);
    expect(days.bucket("2026-10-30T23:00:00.000Z")).toBe("Oct 31");
  });
});
