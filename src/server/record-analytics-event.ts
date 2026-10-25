import type { AnalyticsEventBody } from "../core/event-body.js";
import { AnalyticsEventKind } from "../core/event-kind.js";
import type { NewAnalyticsEvent } from "../core/event.js";
import type { AnalyticsEventStore } from "../core/event-store.js";
import type { AnalyticsServerOptions } from "../core/options.js";
import { readRequestGeo, type RequestGeo } from "./read-request-geo.js";

export type AnalyticsHeaderBag = Headers | Record<string, string | string[] | undefined>;

const PATH_MAX = 2048;
const LOCALE_MAX = 35;
const SESSION_ID_MAX = 36;
const EVENT_NAME_MAX = 64;
const COUNTRY_MAX = 8;
const CITY_MAX = 80;
const DURATION_ID_MAX = 64;
const EVENT_NAME = /^[a-z0-9_]+$/;

export type { RequestGeo };

export interface AnalyticsEventRequest {
  body?: unknown;
  headers?: AnalyticsHeaderBag;
  request?: Request;
  country?: unknown;
  city?: unknown;
}

export interface RecordAnalyticsEventDeps {
  store: AnalyticsEventStore;
  options: AnalyticsServerOptions;
  now?: () => string;
}

export interface RecordAnalyticsEventResult {
  status: number;
  body: { id: string } | null;
}

/**
 * Validates one analytics request and writes it through the store.
 *
 * A stored view or click returns status 200 and `{ id }`.
 * Status 204 and a null body means analytics is disabled, clicks are off, or a duration was recorded.
 * Status 400 and a null body means the request cannot be stored.
 * `occurredAt` comes from `deps.now`, otherwise the server clock.
 * Pass a Fetch `Request`, or `{ body, country, city }`. `request` is read when `body` is omitted.
 * Country and city are the properties on that object. The JSON body is not a source for them.
 */
export async function recordAnalyticsEvent(
  request: AnalyticsEventRequest | Request,
  deps: RecordAnalyticsEventDeps,
): Promise<RecordAnalyticsEventResult> {
  if (!deps.options.enabled) return { status: 204, body: null };

  const incoming = await incomingRequest(request);
  const body = incoming.body;
  if (!isRecord(body) || typeof body.type !== "string") return invalid();

  if (body.type === "view") return recordView(body, incoming, deps);
  if (body.type === "duration") return recordDuration(body, deps);
  if (body.type === "click") return recordClick(body, incoming, deps);
  return invalid();
}

async function recordView(
  body: Record<string, unknown>,
  request: AnalyticsEventRequest,
  deps: RecordAnalyticsEventDeps,
): Promise<RecordAnalyticsEventResult> {
  const parsed = parseLocation(body);
  if (!parsed) return invalid();
  const sessionId = sessionFor(body.sessionId, deps);
  if (sessionId === undefined) return invalid();

  const accepted: AnalyticsEventBody = {
    type: "view",
    path: parsed.path,
    locale: parsed.locale,
    sessionId,
  };

  const stored = await deps.store.insertAnalyticsEvent(newEvent(accepted, request, deps), clock(deps));
  return { status: 200, body: { id: stored.id } };
}

async function recordDuration(
  body: Record<string, unknown>,
  deps: RecordAnalyticsEventDeps,
): Promise<RecordAnalyticsEventResult> {
  if (typeof body.id !== "string" || body.id.length === 0 || body.id.length > DURATION_ID_MAX) {
    return invalid();
  }
  if (typeof body.durationSeconds !== "number") return invalid();

  const accepted: AnalyticsEventBody = {
    type: "duration",
    id: body.id,
    durationSeconds: body.durationSeconds,
  };
  await deps.store.recordAnalyticsDuration(accepted.id, accepted.durationSeconds);
  return { status: 204, body: null };
}

async function recordClick(
  body: Record<string, unknown>,
  request: AnalyticsEventRequest,
  deps: RecordAnalyticsEventDeps,
): Promise<RecordAnalyticsEventResult> {
  if (!deps.options.modules.clicks) return { status: 204, body: null };

  const parsed = parseLocation(body);
  const eventName = body.eventName;
  if (!parsed || !validEventName(eventName)) return invalid();
  const sessionId = sessionFor(body.sessionId, deps);
  if (sessionId === undefined) return invalid();

  const accepted: AnalyticsEventBody = {
    type: "click",
    path: parsed.path,
    locale: parsed.locale,
    sessionId,
    eventName,
  };

  const stored = await deps.store.insertAnalyticsEvent(newEvent(accepted, request, deps), clock(deps));
  return { status: 200, body: { id: stored.id } };
}

function newEvent(
  body: Extract<AnalyticsEventBody, { type: "view" | "click" }>,
  request: AnalyticsEventRequest,
  deps: RecordAnalyticsEventDeps,
): NewAnalyticsEvent {
  const modules = deps.options.modules;
  const geo = readGeo(request);
  return {
    kind: body.type === "click" ? AnalyticsEventKind.CLICK : AnalyticsEventKind.VIEW,
    path: body.path,
    locale: body.locale,
    durationSeconds: null,
    country: modules.country ? geo.country : null,
    city: modules.city ? geo.city : null,
    sessionId: modules.sessions ? body.sessionId : null,
    eventName: body.type === "click" ? body.eventName : null,
  };
}

async function incomingRequest(request: AnalyticsEventRequest | Request): Promise<AnalyticsEventRequest> {
  if (isWebRequest(request)) {
    return { body: await readJsonBody(request), headers: request.headers };
  }
  const source = request.request;
  const body = request.body !== undefined ? request.body : source ? await readJsonBody(source) : undefined;
  return {
    body,
    headers: request.headers ?? source?.headers,
    country: request.country,
    city: request.city,
  };
}

function isWebRequest(request: AnalyticsEventRequest | Request): request is Request {
  return typeof Request !== "undefined" && request instanceof Request;
}

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

function readGeo(request: AnalyticsEventRequest): RequestGeo {
  const read = readRequestGeo(request);
  return {
    country: boundedText(read.country, COUNTRY_MAX),
    city: boundedText(read.city, CITY_MAX),
  };
}

function parseLocation(
  body: Record<string, unknown>,
): { path: string; locale: string | null } | null {
  if (typeof body.path !== "string") return null;
  const path = normalizePath(body.path);
  if (path === null) return null;
  const locale = readLocale(body.locale);
  if (locale === undefined) return null;
  return { path, locale };
}

/** `null` drops the id. `undefined` means the id itself is unusable. */
function sessionFor(
  value: unknown,
  deps: RecordAnalyticsEventDeps,
): string | null | undefined {
  if (!deps.options.modules.sessions) return null;
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > SESSION_ID_MAX) return undefined;
  return value;
}

function readLocale(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > LOCALE_MAX) return undefined;
  return value;
}

function normalizePath(path: string): string | null {
  if (!path.startsWith("/")) return null;
  if (path.includes("://")) return null;
  const queryIndex = path.indexOf("?");
  const withoutQuery = queryIndex === -1 ? path : path.slice(0, queryIndex);
  const hashIndex = withoutQuery.indexOf("#");
  const bare = hashIndex === -1 ? withoutQuery : withoutQuery.slice(0, hashIndex);
  if (bare.length === 0 || bare.length > PATH_MAX) return null;
  if (!bare.startsWith("/")) return null;
  if (/[\u0000-\u001F\u007F]/.test(bare)) return null;
  return bare;
}

function validEventName(value: unknown): value is string {
  return typeof value === "string" && value.length <= EVENT_NAME_MAX && EVENT_NAME.test(value);
}

function boundedText(value: string | null, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) return null;
  return trimmed;
}

function clock(deps: RecordAnalyticsEventDeps): string {
  return deps.now ? deps.now() : new Date().toISOString();
}

function invalid(): RecordAnalyticsEventResult {
  return { status: 400, body: null };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
