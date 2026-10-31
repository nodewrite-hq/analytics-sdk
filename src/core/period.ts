export const AnalyticsPeriod = {
  LAST_24_HOURS: "24h",
  LAST_7_DAYS: "7d",
  LAST_30_DAYS: "30d",
  LAST_12_MONTHS: "12m",
} as const;

export type AnalyticsPeriod = (typeof AnalyticsPeriod)[keyof typeof AnalyticsPeriod];

export const ANALYTICS_PERIODS: readonly AnalyticsPeriod[] = Object.values(AnalyticsPeriod);

export const DEFAULT_ANALYTICS_PERIOD: AnalyticsPeriod = AnalyticsPeriod.LAST_7_DAYS;

export const AnalyticsBucketUnit = {
  HOUR: "hour",
  DAY: "day",
  MONTH: "month",
} as const;

export type AnalyticsBucketUnit = (typeof AnalyticsBucketUnit)[keyof typeof AnalyticsBucketUnit];

const PERIOD_BUCKETS: Record<AnalyticsPeriod, { unit: AnalyticsBucketUnit; count: number }> = {
  [AnalyticsPeriod.LAST_24_HOURS]: { unit: AnalyticsBucketUnit.HOUR, count: 24 },
  [AnalyticsPeriod.LAST_7_DAYS]: { unit: AnalyticsBucketUnit.DAY, count: 7 },
  [AnalyticsPeriod.LAST_30_DAYS]: { unit: AnalyticsBucketUnit.DAY, count: 30 },
  [AnalyticsPeriod.LAST_12_MONTHS]: { unit: AnalyticsBucketUnit.MONTH, count: 12 },
};

/** One step of the chart. `start` is inclusive and `end` exclusive, both ISO instants. */
export interface AnalyticsBucket {
  start: string;
  end: string;
}

export interface AnalyticsPeriodRange {
  period: AnalyticsPeriod;
  unit: AnalyticsBucketUnit;
  from: string;
  to: string;
  buckets: AnalyticsBucket[];
}

export function isAnalyticsPeriod(value: unknown): value is AnalyticsPeriod {
  return typeof value === "string" && (ANALYTICS_PERIODS as readonly string[]).includes(value);
}

/** Throws a RangeError for a time zone the runtime does not know. */
export function assertTimeZone(timeZone: string): void {
  zonedFormatter(timeZone);
}

/**
 * The period that ends now: the current hour, day or month plus the ones before it, counted on
 * the wall clock of `timeZone`, so a day starts at that zone's midnight.
 */
export function analyticsPeriodRange(
  period: AnalyticsPeriod,
  now: Date,
  timeZone: string,
): AnalyticsPeriodRange {
  const { unit, count } = PERIOD_BUCKETS[period];
  const wall = zonedParts(now.getTime(), timeZone);
  const starts: number[] = [];
  for (let back = count - 1; back >= -1; back -= 1) {
    starts.push(wallToInstant(bucketWallStart(unit, wall, back), timeZone));
  }

  const buckets: AnalyticsBucket[] = [];
  for (let index = 0; index < count; index += 1) {
    buckets.push({ start: iso(starts[index]), end: iso(starts[index + 1]) });
  }

  return {
    period,
    unit,
    from: iso(starts[0]),
    to: now.toISOString(),
    buckets,
  };
}

interface WallParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** The bucket `back` steps before the current one, as a wall-clock time encoded in UTC. */
function bucketWallStart(unit: AnalyticsBucketUnit, wall: WallParts, back: number): number {
  if (unit === AnalyticsBucketUnit.HOUR) {
    return Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour - back);
  }
  if (unit === AnalyticsBucketUnit.DAY) {
    return Date.UTC(wall.year, wall.month - 1, wall.day - back);
  }
  return Date.UTC(wall.year, wall.month - 1 - back, 1);
}

/** The instant the zone's clock shows `wall`. Two passes settle a daylight saving change. */
function wallToInstant(wall: number, timeZone: string): number {
  const guess = wall - zoneOffsetMs(wall, timeZone);
  return wall - zoneOffsetMs(guess, timeZone);
}

function zoneOffsetMs(instant: number, timeZone: string): number {
  const parts = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function zonedFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  formatters.set(timeZone, formatter);
  return formatter;
}

function zonedParts(instant: number, timeZone: string): WallParts {
  const parts: Record<string, number> = {};
  for (const part of zonedFormatter(timeZone).formatToParts(new Date(instant))) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return {
    year: parts.year ?? 0,
    month: parts.month ?? 1,
    day: parts.day ?? 1,
    hour: parts.hour ?? 0,
    minute: parts.minute ?? 0,
    second: parts.second ?? 0,
  };
}

function iso(instant: number | undefined): string {
  if (instant === undefined) throw new RangeError("A period bucket has no start");
  return new Date(instant).toISOString();
}
