import type { Config } from "payload";

/** Payload translation namespace: labels are read as `analytics:<key>`. */
export const ANALYTICS_TRANSLATION_NAMESPACE = "analytics";

/** The English labels, shown in every admin language the host does not translate. */
export const ENGLISH_ANALYTICS_LABELS = {
  navGroup: "Statistics",
  navLabel: "Analytics",
  title: "Analytics",
  period: "Period",
  period_24h: "Last 24 hours",
  period_7d: "Last 7 days",
  period_30d: "Last 30 days",
  period_12m: "Last 12 months",
  country: "Country",
  allCountries: "All countries",
  views: "Views",
  averageTime: "Average time on page",
  clicks: "Clicks",
  viewsOverTime: "Views over time",
  topPages: "Top pages",
  allPages: "All pages",
  showAllPages: "Show all pages",
  showTopPages: "Show top pages only",
  page: "Page",
  pageFilter: "Page: {{path}}",
  clearFilter: "Clear",
  countries: "Countries",
  cities: "Cities",
  city: "City",
  event: "Event",
  count: "Count",
  sessions: "Sessions",
  session: "Session",
  started: "Started",
  pages: "Pages",
  sessionEvents: "Session events",
  allSessions: "All sessions",
  time: "Time",
  kind: "Kind",
  kindView: "View",
  kindClick: "Click",
  empty: "Nothing in this period.",
} as const;

export type AnalyticsLabelKey = keyof typeof ENGLISH_ANALYTICS_LABELS;

export type AnalyticsLabels = Record<AnalyticsLabelKey, string>;

/** One admin language's labels. Missing keys show English. `events` names named clicks. */
export type AnalyticsTranslation = Partial<AnalyticsLabels> & {
  events?: Record<string, string>;
};

/** Keyed by Payload admin language, such as `en` or `rs-latin`. */
export type AnalyticsTranslations = Record<string, AnalyticsTranslation>;

type TranslationsByLanguage = Record<string, Record<string, unknown>>;

/**
 * Adds the analytics labels to every admin language the config supports or the host translates,
 * English first, the host's labels over it. Other translations stay as they are.
 */
export function withAnalyticsTranslations(
  i18n: Config["i18n"],
  translations: AnalyticsTranslations = {},
): Config["i18n"] {
  const existing = (i18n?.translations ?? {}) as TranslationsByLanguage;
  const languages = new Set([
    "en",
    ...Object.keys(i18n?.supportedLanguages ?? {}),
    ...Object.keys(translations),
  ]);
  const merged: TranslationsByLanguage = { ...existing };
  for (const language of languages) {
    const current = existing[language] ?? {};
    const host = translations[language] ?? {};
    merged[language] = {
      ...current,
      [ANALYTICS_TRANSLATION_NAMESPACE]: {
        ...ENGLISH_ANALYTICS_LABELS,
        ...host,
        events: { ...host.events },
      },
    };
  }
  return { ...i18n, translations: merged as NonNullable<Config["i18n"]>["translations"] };
}

/** Payload's `t`, narrowed to the keys it is called with here. */
export type TranslateText = (key: string, vars?: Record<string, unknown>) => string;

export function analyticsLabel(
  t: TranslateText,
  key: AnalyticsLabelKey,
  vars?: Record<string, unknown>,
): string {
  return t(`${ANALYTICS_TRANSLATION_NAMESPACE}:${key}`, vars);
}

/**
 * The host's name for a named click, or the event name itself when it has none. Read from the
 * translations directly: Payload's `t` logs every key it cannot find.
 */
export function analyticsEventLabel(translations: unknown, eventName: string): string {
  const namespace = property(translations, ANALYTICS_TRANSLATION_NAMESPACE);
  const label = property(property(namespace, "events"), eventName);
  return typeof label === "string" && label.length > 0 ? label : eventName;
}

function property(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) return undefined;
  return (value as Record<string, unknown>)[key];
}
