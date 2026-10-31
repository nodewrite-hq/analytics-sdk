import type { Access, Config } from "payload";
import { analyticsEventsCollection } from "./collection.js";
import { type AnalyticsEndpointOptions, analyticsEventsEndpoint } from "./endpoint.js";
import { ANALYTICS_CUSTOM_KEY } from "./stored-modules.js";

/** Payload's own default when a config sets no admin route. */
const DEFAULT_ADMIN_ROUTE = "/admin";
const ANALYTICS_VIEW_PATH = "/analytics";

export interface AnalyticsPluginOptions extends AnalyticsEndpointOptions {
  read?: Access;
}

/**
 * Adds the analytics collection, the ingest endpoint, and the admin screen.
 * Existing collections, endpoints, and views stay in place.
 */
export function analyticsPlugin(options: AnalyticsPluginOptions): (config: Config) => Config {
  return (config) => {
    const adminRoute = config.routes?.admin ?? DEFAULT_ADMIN_ROUTE;
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
        [ANALYTICS_CUSTOM_KEY]: {
          enabled: options.enabled,
          modules: options.modules,
        },
      },
    };
  };
}

