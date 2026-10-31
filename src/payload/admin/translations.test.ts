import { describe, expect, it } from "vitest";
import type { Config } from "payload";
import { analyticsEventLabel, ENGLISH_ANALYTICS_LABELS, withAnalyticsTranslations } from "./translations.js";

function analyticsOf(i18n: Config["i18n"], language: string): Record<string, unknown> {
  const translations = (i18n?.translations ?? {}) as Record<string, Record<string, Record<string, unknown>>>;
  return translations[language]?.analytics ?? {};
}

describe("withAnalyticsTranslations", () => {
  const i18n = {
    supportedLanguages: { en: {}, "rs-latin": {}, de: {} },
    translations: { de: { custom: { hello: "Hallo" } } },
  } as unknown as Config["i18n"];

  it("puts the host's labels over English and shows English where the host has none", () => {
    const merged = withAnalyticsTranslations(i18n, {
      "rs-latin": { title: "Analitika", events: { phone_clicked: "Pozivi" } },
    });

    expect(analyticsOf(merged, "rs-latin")).toMatchObject({
      title: "Analitika",
      views: ENGLISH_ANALYTICS_LABELS.views,
      events: { phone_clicked: "Pozivi" },
    });
    expect(analyticsOf(merged, "de")).toMatchObject({ title: ENGLISH_ANALYTICS_LABELS.title });
    expect(analyticsOf(merged, "en")).toMatchObject({ title: ENGLISH_ANALYTICS_LABELS.title });
  });

  it("keeps the config's own translations", () => {
    const merged = withAnalyticsTranslations(i18n);
    const translations = merged?.translations as Record<string, Record<string, unknown>>;

    expect(translations.de?.custom).toEqual({ hello: "Hallo" });
  });

  it("adds a language only the host translates", () => {
    const merged = withAnalyticsTranslations(undefined, { it: { title: "Analisi" } });

    expect(analyticsOf(merged, "it")).toMatchObject({ title: "Analisi" });
    expect(analyticsOf(merged, "en")).toMatchObject({ title: ENGLISH_ANALYTICS_LABELS.title });
  });
});

describe("analyticsEventLabel", () => {
  it("names a click from the host's translations, or shows the event name", () => {
    const translations = { analytics: { events: { phone_clicked: "Phone calls" } } };

    expect(analyticsEventLabel(translations, "phone_clicked")).toBe("Phone calls");
    expect(analyticsEventLabel(translations, "email_clicked")).toBe("email_clicked");
    expect(analyticsEventLabel(undefined, "email_clicked")).toBe("email_clicked");
  });
});
