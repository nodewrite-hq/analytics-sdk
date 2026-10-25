CREATE TABLE IF NOT EXISTS analytics_event (
  id uuid primary key,
  kind text not null,
  path text not null,
  locale text,
  occurred_at timestamptz not null,
  duration_seconds integer,
  country text,
  city text,
  session_id text,
  event_name text
);
