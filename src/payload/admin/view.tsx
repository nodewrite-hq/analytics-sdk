import type { AdminViewServerProps } from "payload";
import { DefaultTemplate } from "@payloadcms/next/templates";
import type { AnalyticsModules } from "../../core/options.js";
import { adminSections, type AdminSection } from "./sections.js";
import { analyticsModulesFromConfig } from "../stored-modules.js";
import { PayloadAnalyticsEventStore } from "../store.js";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const reportStyle = `
.analytics-report {
  box-sizing: border-box;
  display: grid;
  gap: 1.5rem;
  max-width: 72rem;
  padding: 1.5rem 1rem 3rem;
  color: inherit;
}
.analytics-report h1,
.analytics-report h2 {
  margin: 0;
}
.analytics-report a {
  color: inherit;
}
.analytics-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 0.75rem;
  align-items: end;
}
.analytics-filters label {
  display: grid;
  gap: 0.25rem;
}
.analytics-filters input,
.analytics-filters button {
  font: inherit;
  min-height: 2.5rem;
  padding: 0.4rem 0.6rem;
}
.analytics-totals {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 0.75rem;
  margin: 0.75rem 0 0;
}
.analytics-scroll {
  overflow-x: auto;
  margin-top: 0.75rem;
}
.analytics-report table {
  width: 100%;
  border-collapse: collapse;
}
.analytics-report th,
.analytics-report td {
  text-align: start;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid currentColor;
  vertical-align: top;
}
.analytics-back {
  justify-self: start;
}
@media (max-width: 40rem) {
  .analytics-report {
    padding: 1rem 0.75rem 2rem;
  }
}
`;

export async function AnalyticsAdminView(props: AdminViewServerProps) {
  if (!props.initPageResult.req.user) return null;

  const modules = analyticsModulesFromConfig(props.payload.config);
  const range = resolveRange(props.searchParams);
  const country = modules.country ? firstParam(props.searchParams?.country) : null;
  const path = firstParam(props.searchParams?.path);
  const session = modules.sessions ? firstParam(props.searchParams?.session) : null;
  const store = new PayloadAnalyticsEventStore(props.payload, modules);
  const summary = await store.summarizeAnalytics(
    {
      from: range.from,
      to: range.to,
      country,
      path,
      sessionId: session,
    },
    modules,
  );
  const sections = adminSections(summary, modules, { session });
  const visibleEntities = props.visibleEntities ?? props.initPageResult.visibleEntities;

  return (
    <DefaultTemplate
      i18n={props.i18n}
      payload={props.payload}
      req={props.initPageResult.req}
      viewType={props.viewType}
      visibleEntities={visibleEntities}
    >
      <div className="analytics-report">
        <style>{reportStyle}</style>
        <h1>Analytics</h1>
        <FilterForm
          from={range.from}
          to={range.to}
          country={country}
          path={path}
          session={session}
          modules={modules}
        />
        {session ? (
          <a className="analytics-back" href={reportHref({ from: range.from, to: range.to, country, path })}>
            All sessions
          </a>
        ) : null}
        {sections.map((section) => (
          <SectionBlock
            key={section.kind}
            section={section}
            hrefForSession={(id) =>
              reportHref({ from: range.from, to: range.to, country, path, session: id })
            }
          />
        ))}
      </div>
    </DefaultTemplate>
  );
}

function FilterForm({
  from,
  to,
  country,
  path,
  session,
  modules,
}: {
  from: string;
  to: string;
  country: string | null;
  path: string | null;
  session: string | null;
  modules: AnalyticsModules;
}) {
  return (
    <form className="analytics-filters" method="get" action="/admin/analytics">
      <label>
        From
        <input name="from" type="text" defaultValue={from} autoComplete="off" />
      </label>
      <label>
        To
        <input name="to" type="text" defaultValue={to} autoComplete="off" />
      </label>
      {modules.country ? (
        <label>
          Country
          <input name="country" type="text" defaultValue={country ?? ""} maxLength={2} autoComplete="off" />
        </label>
      ) : null}
      <label>
        Path
        <input name="path" type="text" defaultValue={path ?? ""} maxLength={2048} autoComplete="off" />
      </label>
      {session ? <input type="hidden" name="session" value={session} /> : null}
      <button type="submit">Apply</button>
    </form>
  );
}

function SectionBlock({
  section,
  hrefForSession,
}: {
  section: AdminSection;
  hrefForSession: (id: string) => string;
}) {
  switch (section.kind) {
    case "totals":
      return (
        <section>
          <h2>Totals</h2>
          <dl className="analytics-totals">
            <div>
              <dt>Total views</dt>
              <dd>{section.totalViews}</dd>
            </div>
            <div>
              <dt>Average duration</dt>
              <dd>{formatSeconds(section.averageDurationSeconds)}</dd>
            </div>
          </dl>
        </section>
      );
    case "paths":
      return (
        <DataTable
          title="Paths"
          columns={["Path", "Views", "Average duration"]}
          rows={section.rows.map((row) => [row.path, String(row.views), formatSeconds(row.averageDurationSeconds)])}
        />
      );
    case "countries":
      return (
        <DataTable
          title="Countries"
          columns={["Country", "Views"]}
          rows={section.rows.map((row) => [row.country, String(row.views)])}
        />
      );
    case "cities":
      return (
        <DataTable
          title="Cities"
          columns={["City", "Views"]}
          rows={section.rows.map((row) => [row.city, String(row.views)])}
        />
      );
    case "namedClicks":
      return (
        <DataTable
          title="Named clicks"
          columns={["Event", "Count"]}
          rows={section.rows.map((row) => [row.eventName, String(row.count)])}
        />
      );
    case "sessions":
      return (
        <section>
          <h2>Sessions</h2>
          <div className="analytics-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Session</th>
                  <th scope="col">Started</th>
                  <th scope="col">Pages</th>
                </tr>
              </thead>
              <tbody>
                {section.rows.length === 0 ? (
                  <tr>
                    <td colSpan={3}>None in this range.</td>
                  </tr>
                ) : (
                  section.rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <a href={hrefForSession(row.id)}>{row.id}</a>
                      </td>
                      <td>{row.startedAt}</td>
                      <td>{row.pageCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      );
    case "trail":
      return (
        <DataTable
          title="Session events"
          columns={["Time", "Kind", "Path", "Event"]}
          rows={section.events.map((event) => [
            event.occurredAt,
            event.kind === "click" ? "Click" : "View",
            event.path,
            event.eventName ?? "",
          ])}
        />
      );
  }
}

function DataTable({ title, columns, rows }: { title: string; columns: string[]; rows: string[][] }) {
  return (
    <section>
      <h2>{title}</h2>
      <div className="analytics-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>None in this range.</td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${title}-${index}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${columns[cellIndex] ?? cellIndex}`}>{cell}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function reportHref(query: {
  from: string;
  to: string;
  country: string | null;
  path: string | null;
  session?: string;
}): string {
  const params = new URLSearchParams();
  params.set("from", query.from);
  params.set("to", query.to);
  if (query.country) params.set("country", query.country);
  if (query.path) params.set("path", query.path);
  if (query.session) params.set("session", query.session);
  return `/admin/analytics?${params.toString()}`;
}

function resolveRange(searchParams: AdminViewServerProps["searchParams"]): { from: string; to: string } {
  const now = new Date();
  const to = parseTime(firstParam(searchParams?.to), now);
  const from = parseTime(firstParam(searchParams?.from), new Date(to.getTime() - WEEK_MS));
  return { from: from.toISOString(), to: to.toISOString() };
}

function parseTime(value: string | null, fallback: Date): Date {
  if (value === null) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed;
}

function firstParam(value: string | readonly string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first !== "string") return null;
  const trimmed = first.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function formatSeconds(value: number): string {
  if (!Number.isFinite(value)) return "0 seconds";
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} ${rounded === 1 ? "second" : "seconds"}`;
}
