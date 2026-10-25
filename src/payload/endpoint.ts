import type { Endpoint, PayloadRequest } from "payload";
import type { AnalyticsServerOptions } from "../core/options.js";
import type { RecordAnalyticsEventDeps } from "../server/record-analytics-event.js";
import { recordAnalyticsEvent } from "../server/record-analytics-event.js";
import { PayloadAnalyticsEventStore } from "./store.js";

export interface AnalyticsEndpointRequest {
  body: unknown;
  headers: Headers | Record<string, string | string[] | undefined>;
}

/**
 * Builds the plain request recordAnalyticsEvent already accepts.
 * A country on the JSON body is not copied onto the stored row. That function ignores it.
 */
export async function handleAnalyticsEvent(
  request: AnalyticsEndpointRequest,
  deps: RecordAnalyticsEventDeps,
): Promise<Response> {
  const result = await recordAnalyticsEvent(
    { body: request.body, headers: headerRecord(request.headers) },
    deps,
  );
  if (result.status === 204 || result.body === null) {
    return new Response(null, { status: result.status });
  }
  return Response.json(result.body, { status: result.status });
}

export function analyticsEventsEndpoint(options: AnalyticsServerOptions): Endpoint {
  return {
    path: "/analytics/events",
    method: "post",
    handler: (req) => handlePayloadAnalyticsEvent(req, options),
  };
}

async function handlePayloadAnalyticsEvent(
  req: PayloadRequest,
  options: AnalyticsServerOptions,
): Promise<Response> {
  const store = new PayloadAnalyticsEventStore(req.payload, options.modules);
  let body: unknown;
  try {
    body = typeof req.json === "function" ? await req.json() : req.data;
  } catch {
    body = undefined;
  }
  return handleAnalyticsEvent({ body, headers: req.headers }, { store, options });
}

function headerRecord(
  headers: Headers | Record<string, string | string[] | undefined>,
): Record<string, string | string[] | undefined> {
  if (headers instanceof Headers) {
    const record: Record<string, string | string[] | undefined> = {};
    headers.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }
  return headers;
}
