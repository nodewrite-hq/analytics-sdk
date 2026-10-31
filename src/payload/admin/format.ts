import { AnalyticsBucketUnit } from "../../core/period.js";

const FALLBACK_LOCALE = "en";
const SECONDS_PER_MINUTE = 60;

/**
 * The BCP 47 tag for an admin language: the host's mapping first, then Payload's date locale,
 * then English when the runtime does not know either.
 */
export function resolveFormatLocale(
  language: string,
  dateLocale: string | undefined,
  formatLocales: Record<string, string>,
): string {
  for (const candidate of [formatLocales[language], dateLocale, language]) {
    if (candidate && isKnownLocale(candidate)) return candidate;
  }
  return FALLBACK_LOCALE;
}

function isKnownLocale(tag: string): boolean {
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([tag]).length > 0;
  } catch {
    // supportedLocalesOf throws a RangeError for a malformed tag; that tag is simply not usable.
    return false;
  }
}

export interface ReportFormat {
  number: (value: number) => string;
  duration: (seconds: number) => string;
  bucket: (start: string) => string;
  dateTime: (instant: string) => string;
  country: (code: string) => string;
}

export function reportFormat(locale: string, timeZone: string, unit: AnalyticsBucketUnit): ReportFormat {
  const numbers = new Intl.NumberFormat(locale);
  const seconds = new Intl.NumberFormat(locale, { style: "unit", unit: "second", unitDisplay: "short" });
  const minutes = new Intl.NumberFormat(locale, { style: "unit", unit: "minute", unitDisplay: "short" });
  const buckets = new Intl.DateTimeFormat(locale, { timeZone, ...BUCKET_FORMAT[unit] });
  const instants = new Intl.DateTimeFormat(locale, { timeZone, dateStyle: "short", timeStyle: "short" });
  const regions = new Intl.DisplayNames([locale], { type: "region", fallback: "code" });

  return {
    number: (value) => numbers.format(value),
    duration: (value) => {
      const total = Number.isFinite(value) ? Math.round(value) : 0;
      if (total < SECONDS_PER_MINUTE) return seconds.format(total);
      const rest = total % SECONDS_PER_MINUTE;
      const whole = minutes.format(Math.floor(total / SECONDS_PER_MINUTE));
      return rest === 0 ? whole : `${whole} ${seconds.format(rest)}`;
    },
    bucket: (start) => buckets.format(new Date(start)),
    dateTime: (instant) => instants.format(new Date(instant)),
    country: (code) => {
      try {
        return regions.of(code) ?? code;
      } catch {
        // A stored code the runtime rejects still shows, as the code itself.
        return code;
      }
    },
  };
}

const BUCKET_FORMAT: Record<AnalyticsBucketUnit, Intl.DateTimeFormatOptions> = {
  [AnalyticsBucketUnit.HOUR]: { hour: "2-digit", minute: "2-digit" },
  [AnalyticsBucketUnit.DAY]: { day: "numeric", month: "short" },
  [AnalyticsBucketUnit.MONTH]: { month: "short", year: "numeric" },
};
