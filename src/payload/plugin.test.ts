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
      {
        path: "@nodewrite-labs/analytics-sdk/payload/nav-link",
        exportName: "AnalyticsNavLink",
        clientProps: { href: "/admin/analytics" },
      },
    ]);
    expect(next.custom).toMatchObject({
      site: "client",
      analytics: { enabled: true, modules },
    });
    expect(next.collections?.find((collection) => collection.slug === "analytics-events")?.admin?.hidden).toBe(
      true,
    );
  });

  it("links the nav entry to the analytics view under the configured admin route", () => {
    const next = analyticsPlugin({ enabled: true, modules })({
      routes: { admin: "/administrator" },
    } as unknown as Config);

    expect(next.admin?.components?.afterNavLinks).toEqual([
      {
        path: "@nodewrite-labs/analytics-sdk/payload/nav-link",
        exportName: "AnalyticsNavLink",
        clientProps: { href: "/administrator/analytics" },
      },
    ]);
  });

  it("puts the report's filters in the import map and keeps other dependencies", () => {
    const next = analyticsPlugin({ enabled: true, modules })({
      admin: { dependencies: { existing: { type: "component", path: "app/existing#Existing" } } },
    } as unknown as Config);

    expect(next.admin?.dependencies).toEqual({
      existing: { type: "component", path: "app/existing#Existing" },
      nodewriteAnalyticsFilters: {
        type: "component",
        path: "@nodewrite-labs/analytics-sdk/payload/admin-filters#AnalyticsFilters",
      },
    });
  });

  it("stores the time zone and format locales for the report, UTC by default", () => {
    const zoned = analyticsPlugin({
      enabled: true,
      modules,
      timeZone: "Europe/Podgorica",
      formatLocales: { "rs-latin": "sr-Latn" },
    })({} as Config);
    expect(zoned.custom).toMatchObject({
      analytics: { timeZone: "Europe/Podgorica", formatLocales: { "rs-latin": "sr-Latn" } },
    });

    const plain = analyticsPlugin({ enabled: true, modules })({} as Config);
    expect(plain.custom).toMatchObject({ analytics: { timeZone: "UTC", formatLocales: {} } });
  });

  it("refuses an unknown time zone when the plugin is set up", () => {
    expect(() => analyticsPlugin({ enabled: true, modules, timeZone: "Nowhere/Town" })).toThrow(RangeError);
  });

  it("adds the host's labels to the admin translations", () => {
    const next = analyticsPlugin({
      enabled: true,
      modules,
      translations: { "rs-latin": { title: "Analitika" } },
    })({ i18n: { supportedLanguages: { "rs-latin": {} } } } as unknown as Config);
    const translations = next.i18n?.translations as Record<string, Record<string, Record<string, string>>>;

    expect(translations["rs-latin"]?.analytics?.title).toBe("Analitika");
    expect(translations.en?.analytics?.title).toBe("Analytics");
  });
});
