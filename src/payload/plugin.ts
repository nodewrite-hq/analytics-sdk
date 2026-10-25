import type { Access, Config } from "payload";
import type { AnalyticsServerOptions } from "../core/options.js";
import { analyticsEventsCollection } from "./collection.js";
import { analyticsEventsEndpoint } from "./endpoint.js";
import { ANALYTICS_CUSTOM_KEY } from "./stored-modules.js";

/**
 * Adds the analytics collection, the ingest endpoint, and the admin screen.
 * Existing collections, endpoints, and views stay in place.
 */
export function analyticsPlugin(
  options: AnalyticsServerOptions & { read?: Access },
): (config: Config) => Config {
  return (config) => {
    const admin = config.admin ?? {};
    const components = admin.components ?? {};
    return {
      ...config,
      collections: [...(config.collections ?? []), analyticsEventsCollection(options.read)],
      endpoints: [...(config.endpoints ?? []), analyticsEventsEndpoint(options)],
      admin: {
        ...admin,
        components: {
          ...components,
          views: {
            ...components.views,
            analytics: {
              Component: {
                path: "@nodewrite-labs/analytics-sdk/payload/admin-view",
                exportName: "AnalyticsAdminView",
              },
              path: "/analytics",
            },
          },
          afterNavLinks: [
            ...(components.afterNavLinks ?? []),
            {
              path: "@nodewrite-labs/analytics-sdk/payload/nav-link",
              exportName: "AnalyticsNavLink",
            },
          ],
        },
      },
      custom: {
        ...config.custom,
        [ANALYTICS_CUSTOM_KEY]: {
          enabled: options.enabled,
          modules: options.modules,
        },
      },
    };
  };
}

