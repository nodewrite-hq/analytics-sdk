import { describe, expect, it } from "vitest";
import type { Config } from "payload";
import type { AnalyticsModules } from "../core/options.js";
import { analyticsPlugin } from "./plugin.js";

const modules: AnalyticsModules = {
  country: true,
  city: false,
  sessions: false,
  clicks: false,
};

describe("analyticsPlugin", () => {
  it("appends the collection, endpoint, view, and nav link without removing existing ones", () => {
    const plugin = analyticsPlugin({ enabled: true, modules });
    const next = plugin({
      collections: [{ slug: "pages", fields: [] }],
      endpoints: [
        {
          path: "/health",
          method: "get",
          handler: () => new Response(null, { status: 204 }),
        },
      ],
      admin: {
        components: {
          views: {
            dashboard: {
              Component: { path: "app/dashboard", exportName: "Dashboard" },
              path: "/",
            },
          },
          afterNavLinks: [{ path: "app/link", exportName: "ExistingLink" }],
        },
      },
      custom: { site: "client" },
    } as unknown as Config);

    expect(next.collections?.map((collection) => collection.slug)).toEqual(["pages", "analytics-events"]);
    expect(next.endpoints?.map((endpoint) => endpoint.path)).toEqual(["/health", "/analytics/events"]);
    expect(next.admin?.components?.views?.dashboard).toEqual({
      Component: { path: "app/dashboard", exportName: "Dashboard" },
      path: "/",
    });
    expect(next.admin?.components?.views?.analytics).toEqual({
      Component: {
        path: "@nodewrite-labs/analytics-sdk/payload/admin-view",
        exportName: "AnalyticsAdminView",
      },
      path: "/analytics",
    });
    expect(next.admin?.components?.afterNavLinks).toEqual([
      { path: "app/link", exportName: "ExistingLink" },
      { path: "@nodewrite-labs/analytics-sdk/payload/nav-link", exportName: "AnalyticsNavLink" },
    ]);
    expect(next.custom).toMatchObject({
      site: "client",
      analytics: { enabled: true, modules },
    });
    expect(next.collections?.find((collection) => collection.slug === "analytics-events")?.admin?.hidden).toBe(
      true,
    );
  });
});
