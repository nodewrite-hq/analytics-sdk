import { DefaultTemplate } from "@payloadcms/next/templates";
import { Gutter } from "@payloadcms/ui";
import { RenderServerComponent } from "@payloadcms/ui/elements/RenderServerComponent";
import { notFound } from "next/navigation.js";
import type { AdminViewServerProps, Payload } from "payload";
import { ANALYTICS_PERIODS, analyticsPeriodRange } from "../../core/period.js";
import { ANALYTICS_EVENTS_SLUG } from "../collection.js";
import { PayloadAnalyticsEventStore } from "../store.js";
import { type AnalyticsAdminSettings, analyticsAdminSettingsFromConfig } from "../stored-modules.js";
import { ANALYTICS_FILTERS_PATH } from "./component-paths.js";
import type { AnalyticsFilter, AnalyticsFiltersProps } from "./filters.js";
import { type ReportFormat, reportFormat, resolveFormatLocale } from "./format.js";
import { type AnalyticsReport, buildAnalyticsReport } from "./report.js";
import { type AnalyticsReportQuery, parseReportQuery, reportHref } from "./report-query.js";
import type { ReportLabel } from "./report-tables.js";
import { AnalyticsReportView } from "./report-view.js";
import { analyticsEventLabel, analyticsLabel, type TranslateText } from "./translations.js";

const ANALYTICS_VIEW_PATH = "/analytics";
const PERIOD_FILTER_ID = "nwa-period";
const COUNTRY_FILTER_ID = "nwa-country";
/** The country dropdown's "all countries" option; never a country code. */
const ALL_COUNTRIES = "all";

/** The analytics screen inside Payload's own admin frame, sidebar included. */
export async function AnalyticsAdminView(props: AdminViewServerProps) {
  const { initPageResult, i18n, params, searchParams } = props;
  const { req, permissions, locale, visibleEntities } = initPageResult;
  if (!req.user || !permissions.collections?.[ANALYTICS_EVENTS_SLUG]?.read) notFound();

  const payload = req.payload;
  const settings = analyticsAdminSettingsFromConfig(payload.config);
  const query = parseReportQuery(searchParams, settings.modules);
  const range = analyticsPeriodRange(query.period, new Date(), settings.timeZone);
  const report = await loadReport(payload, settings, query, range);
  const formatLocale = resolveFormatLocale(i18n.language, i18n.dateFNSKey, settings.formatLocales);
  const format = reportFormat(formatLocale, settings.timeZone, range.unit);
  const t = i18n.t as TranslateText;
  const label: ReportLabel = (key, vars) => analyticsLabel(t, key, vars);
  const viewHref = `${payload.config.routes.admin}${ANALYTICS_VIEW_PATH}`;
  const filters: AnalyticsFiltersProps = {
    filters: reportFilters({ query, report, viewHref, label, format, hasCountries: settings.modules.country }),
  };

  return (
    <DefaultTemplate
      i18n={i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user}
      viewType={props.viewType}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <AnalyticsReportView
          report={report}
          query={query}
          modules={settings.modules}
          viewHref={viewHref}
          label={label}
          format={format}
          eventLabel={(eventName) => analyticsEventLabel(i18n.translations, eventName)}
          filters={RenderServerComponent({
            Component: ANALYTICS_FILTERS_PATH,
            importMap: payload.importMap,
            clientProps: filters,
          })}
        />
      </Gutter>
    </DefaultTemplate>
  );
}

async function loadReport(
  payload: Payload,
  settings: AnalyticsAdminSettings,
  query: AnalyticsReportQuery,
  range: ReturnType<typeof analyticsPeriodRange>,
): Promise<AnalyticsReport> {
  const store = new PayloadAnalyticsEventStore(payload, settings.modules);
  const base = { from: range.from, to: range.to, path: query.path, sessionId: query.session };
  const summary = await store.summarizeAnalytics(
    { ...base, country: query.country, buckets: range.buckets },
    settings.modules,
  );
  const periodSummary =
    query.country === null
      ? summary
      : await store.summarizeAnalytics({ ...base, country: null }, settings.modules);
  return buildAnalyticsReport({ summary, periodSummary, modules: settings.modules, query });
}

interface ReportFiltersInput {
  query: AnalyticsReportQuery;
  report: AnalyticsReport;
  viewHref: string;
  label: ReportLabel;
  format: ReportFormat;
  hasCountries: boolean;
}

function reportFilters({ query, report, viewHref, label, format, hasCountries }: ReportFiltersInput): AnalyticsFilter[] {
  const filters: AnalyticsFilter[] = [
    {
      id: PERIOD_FILTER_ID,
      label: label("period"),
      value: query.period,
      options: ANALYTICS_PERIODS.map((period) => ({ value: period, label: label(`period_${period}`) })),
      hrefs: Object.fromEntries(
        ANALYTICS_PERIODS.map((period) => [period, reportHref(viewHref, query, { period })]),
      ),
    },
  ];
  if (!hasCountries) return filters;

  const countries = query.country && !report.countryOptions.includes(query.country)
    ? [query.country, ...report.countryOptions]
    : report.countryOptions;
  filters.push({
    id: COUNTRY_FILTER_ID,
    label: label("country"),
    value: query.country ?? ALL_COUNTRIES,
    options: [
      { value: ALL_COUNTRIES, label: label("allCountries") },
      ...countries.map((country) => ({ value: country, label: format.country(country) })),
    ],
    hrefs: {
      [ALL_COUNTRIES]: reportHref(viewHref, query, { country: null }),
      ...Object.fromEntries(
        countries.map((country) => [country, reportHref(viewHref, query, { country })]),
      ),
    },
  });
  return filters;
}
