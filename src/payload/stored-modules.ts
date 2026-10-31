import type { AnalyticsModules } from "../core/options.js";

export const ANALYTICS_CUSTOM_KEY = "analytics";

export const DEFAULT_ANALYTICS_TIME_ZONE = "UTC";

/** What the plugin leaves on `config.custom` for the admin screen. */
export interface AnalyticsCustom {
  enabled: boolean;
  modules: AnalyticsModules;
  timeZone: string;
  formatLocales: Record<string, string>;
}

export interface AnalyticsAdminSettings {
  modules: AnalyticsModules;
  timeZone: string;
  formatLocales: Record<string, string>;
}

const MODULES_OFF: AnalyticsModules = { country: false, city: false, sessions: false, clicks: false };

export function analyticsModulesFromConfig(config: {
  custom?: Record<string, unknown> | undefined;
}): AnalyticsModules {
  return analyticsAdminSettingsFromConfig(config).modules;
}

export function analyticsAdminSettingsFromConfig(config: {
  custom?: Record<string, unknown> | undefined;
}): AnalyticsAdminSettings {
  const stored = config.custom?.[ANALYTICS_CUSTOM_KEY];
  if (!isRecord(stored) || !isModules(stored.modules)) {
    return { modules: MODULES_OFF, timeZone: DEFAULT_ANALYTICS_TIME_ZONE, formatLocales: {} };
  }
  return {
    modules: stored.modules,
    timeZone: typeof stored.timeZone === "string" ? stored.timeZone : DEFAULT_ANALYTICS_TIME_ZONE,
    formatLocales: isStringRecord(stored.formatLocales) ? stored.formatLocales : {},
  };
}

function isModules(value: unknown): value is AnalyticsModules {
  if (!isRecord(value)) return false;
  return (
    typeof value.country === "boolean" &&
    typeof value.city === "boolean" &&
    typeof value.sessions === "boolean" &&
    typeof value.clicks === "boolean"
  );
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
