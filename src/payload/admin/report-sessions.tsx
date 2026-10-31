import { AnalyticsEventKind } from "../../core/event-kind.js";
import type { ReportFormat } from "./format.js";
import type { AnalyticsReport } from "./report.js";
import { RankedTable, type ReportLabel } from "./report-tables.js";

interface SessionsProps {
  report: AnalyticsReport;
  label: ReportLabel;
  format: ReportFormat;
  sessionHref: (id: string) => string;
  allSessionsHref: string;
  eventLabel: (eventName: string) => string;
}

/** The session list, or one session's events in time order when a session is open. */
export function SessionsSection({ report, label, format, sessionHref, allSessionsHref, eventLabel }: SessionsProps) {
  if (report.trail) {
    return (
      <RankedTable
        title={label("sessionEvents")}
        columns={[label("time"), label("kind"), label("page"), label("event")]}
        empty={label("empty")}
        rows={report.trail.map((event) => ({
          key: event.id,
          name: format.dateTime(event.occurredAt),
          values: [
            event.kind === AnalyticsEventKind.CLICK ? label("kindClick") : label("kindView"),
            event.path,
            event.eventName ? eventLabel(event.eventName) : "",
          ],
        }))}
        footer={
          <a className="nwa-more" href={allSessionsHref}>
            {label("allSessions")}
          </a>
        }
      />
    );
  }

  return (
    <RankedTable
      title={label("sessions")}
      columns={[label("session"), label("started"), label("pages")]}
      empty={label("empty")}
      rows={(report.sessions ?? []).map((session) => ({
        key: session.id,
        name: session.id,
        href: sessionHref(session.id),
        values: [format.dateTime(session.startedAt), format.number(session.pageCount)],
      }))}
    />
  );
}
