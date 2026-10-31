import type { Access, Config } from "payload";
import { assertTimeZone } from "../core/period.js";
import { ANALYTICS_FILTERS_DEPENDENCY, ANALYTICS_FILTERS_PATH } from "./admin/component-paths.js";
import { type AnalyticsTranslations, withAnalyticsTranslations } from "./admin/translations.js";
import { analyticsEventsCollection } from "./collection.js";
import { type AnalyticsEndpointOptions, analyticsEventsEndpoint } from "./endpoint.js";
import { ANALYTICS_CUSTOM_KEY, type AnalyticsCustom, DEFAULT_ANALYTICS_TIME_ZONE } from "./stored-modules.js";

/** Payload's own default when a config sets no admin route. */
const DEFAULT_ADMIN_ROUTE = "/admin";
const ANALYTICS_VIEW_PATH = "/analytics";

export interface AnalyticsPluginOptions extends AnalyticsEndpointOptions {
  read?: Access;
  /** IANA time zone the report's hours, days and months follow. Defaults to UTC. */
  timeZone?: string;
  /**
   * Labels per Payload admin language, over the English defaults. A language with no entry
   * shows English, so the package never needs to know the host's languages.
   */
  translations?: AnalyticsTranslations;
  /**
   * The BCP 47 tag per admin language for numbers, dates and country names, for languages whose
   * Payload code is not one (`rs-latin` → `sr-Latn`). Others use Payload's date locale.
   */
  formatLocales?: Record<string, string>;
}

/**
 * Adds the analytics collection, the ingest endpoint, the admin screen, and its sidebar link.
 * Existing collections, endpoints, views, and translations stay in place.
 */
export function analyticsPlugin(options: AnalyticsPluginOptions): (config: Config) => Config {
  const timeZone = options.timeZone ?? DEFAULT_ANALYTICS_TIME_ZONE;
  assertTimeZone(timeZone);
  const custom: AnalyticsCustom = {
    enabled: options.enabled,
    modules: options.modules,
    timeZone,
    formatLocales: options.formatLocales ?? {},
  };

  return (config) => {
    const adminRoute = config.routes?.admin ?? DEFAULT_ADMIN_ROUTE;
    const admin = config.admin ?? {};
    const components = admin.components ?? {};
    return {
      ...config,
      collections: [...(config.collections ?? []), analyticsEventsCollection(options.read)],
      endpoints: [...(config.endpoints ?? []), analyticsEventsEndpoint(options)],
      i18n: withAnalyticsTranslations(config.i18n, options.translations),
      admin: {
        ...admin,
        dependencies: {
          ...admin.dependencies,
          [ANALYTICS_FILTERS_DEPENDENCY]: { type: "component", path: ANALYTICS_FILTERS_PATH },
        },
        components: {
          ...components,
          views: {
            ...components.views,
            analytics: {
              Component: {
                path: "@nodewrite-labs/analytics-sdk/payload/admin-view",
                exportName: "AnalyticsAdminView",
              },
              path: ANALYTICS_VIEW_PATH,
            },
          },
          afterNavLinks: [
            ...(components.afterNavLinks ?? []),
            {
              path: "@nodewrite-labs/analytics-sdk/payload/nav-link",
              exportName: "AnalyticsNavLink",
              clientProps: { href: `${adminRoute}${ANALYTICS_VIEW_PATH}` },
            },
          ],
        },
      },
      custom: {
        ...config.custom,
        [ANALYTICS_CUSTOM_KEY]: custom,
      },
    };
  };
}
