import type { AnalyticsModules } from "../core/options.js";

export const ANALYTICS_CUSTOM_KEY = "analytics";

interface AnalyticsCustom {
  enabled: boolean;
  modules: AnalyticsModules;
}

export function analyticsModulesFromConfig(config: {
  custom?: Record<string, unknown> | undefined;
}): AnalyticsModules {
  const stored = config.custom?.[ANALYTICS_CUSTOM_KEY];
  if (!isAnalyticsCustom(stored)) {
    return { country: false, city: false, sessions: false, clicks: false };
  }
  return stored.modules;
}

function isAnalyticsCustom(value: unknown): value is AnalyticsCustom {
  if (typeof value !== "object" || value === null || !("modules" in value)) return false;
  const modules = value.modules;
  if (typeof modules !== "object" || modules === null) return false;
  return (
    hasBoolean(modules, "country") &&
    hasBoolean(modules, "city") &&
    hasBoolean(modules, "sessions") &&
    hasBoolean(modules, "clicks")
  );
}

function hasBoolean(value: object, key: string): boolean {
  const record = value as Record<string, unknown>;
  return typeof record[key] === "boolean";
}
