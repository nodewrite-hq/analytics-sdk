import type { AnalyticsEventBody } from "../core/event-body.js";
import type { AnalyticsClientConfig } from "../core/options.js";
import { bindAnalyticsClient, recordNamedClick } from "./record-named-click.js";
import { ensureSessionId } from "./session-cookie.js";

const MAX_DURATION_SECONDS = 1800;

type HistoryUpdate = History["pushState"];

let endpoint = "";
let locale: string | null = null;
let sessionId: string | null = null;
let viewGeneration = 0;
let currentPath: string | null = null;
let currentViewId: string | null = null;
let viewSentAt = 0;

let restoreHistory: (() => void) | null = null;
let removePopState: (() => void) | null = null;
let removePageHide: (() => void) | null = null;
let removeClick: (() => void) | null = null;

export function startAnalytics(config: AnalyticsClientConfig): void {
  stopAnalytics();
  if (!config.enabled) return;

  endpoint = config.endpoint;
  locale = config.locale ?? null;
  sessionId = config.sessions ? ensureSessionId() : null;

  bindAnalyticsClient({
    locale,
    sessionId,
    clicks: config.clicks,
    send: (body) => {
      void postJson(endpoint, body);
    },
  });

  installHistory();
  installPageHide();
  if (config.clicks) installClickListener();
  void sendView();
}

function stopAnalytics(): void {
  viewGeneration += 1;
  currentViewId = null;
  currentPath = null;
  viewSentAt = 0;
  bindAnalyticsClient(null);
  removeClick?.();
  removeClick = null;
  removePageHide?.();
  removePageHide = null;
  removePopState?.();
  removePopState = null;
  restoreHistory?.();
  restoreHistory = null;
}

function installHistory(): void {
  const originalPushState: HistoryUpdate = history.pushState.bind(history);
  const originalReplaceState: HistoryUpdate = history.replaceState.bind(history);

  history.pushState = (data, unused, url) => {
    originalPushState(data, unused, url);
    void onPathChange();
  };
  history.replaceState = (data, unused, url) => {
    originalReplaceState(data, unused, url);
    void onPathChange();
  };

  const onPopState = (): void => {
    void onPathChange();
  };
  window.addEventListener("popstate", onPopState);

  restoreHistory = () => {
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
  };
  removePopState = () => {
    window.removeEventListener("popstate", onPopState);
  };
}

function installPageHide(): void {
  const onPageHide = (): void => {
    if (currentViewId === null) return;
    const body: AnalyticsEventBody = {
      type: "duration",
      id: currentViewId,
      durationSeconds: capDuration((Date.now() - viewSentAt) / 1000),
    };
    try {
      navigator.sendBeacon(endpoint, new Blob([JSON.stringify(body)], { type: "application/json" }));
    } catch {
      // The document is going away. A missing beacon must not surface as a page error.
    }
  };
  window.addEventListener("pagehide", onPageHide);
  removePageHide = () => {
    window.removeEventListener("pagehide", onPageHide);
  };
}

function installClickListener(): void {
  const onClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const marked = target.closest("[data-analytics]");
    if (marked === null) return;
    const name = marked.getAttribute("data-analytics");
    if (name === null) return;
    recordNamedClick(name);
  };
  document.addEventListener("click", onClick);
  removeClick = () => {
    document.removeEventListener("click", onClick);
  };
}

async function onPathChange(): Promise<void> {
  const path = location.pathname;
  if (path === currentPath) return;

  const previousId = currentViewId;
  const previousSentAt = viewSentAt;
  viewGeneration += 1;
  currentViewId = null;
  currentPath = path;

  if (previousId !== null) {
    const durationBody: AnalyticsEventBody = {
      type: "duration",
      id: previousId,
      durationSeconds: capDuration((Date.now() - previousSentAt) / 1000),
    };
    try {
      await postJson(endpoint, durationBody);
    } catch {
      // Still open the next view when the duration request fails.
    }
  }

  if (location.pathname !== path) return;
  await sendView();
}

async function sendView(): Promise<void> {
  const generation = ++viewGeneration;
  const path = location.pathname;
  currentPath = path;
  const sentAt = Date.now();
  viewSentAt = sentAt;
  currentViewId = null;

  const body: AnalyticsEventBody = {
    type: "view",
    path,
    locale,
    sessionId,
  };

  try {
    const response = await postJson(endpoint, body);
    const id = await readViewId(response);
    if (generation !== viewGeneration) return;
    currentViewId = id;
  } catch {
    if (generation !== viewGeneration) return;
    currentViewId = null;
  }
}

interface JsonResponse {
  json: () => Promise<unknown>;
}

async function postJson(url: string, body: AnalyticsEventBody): Promise<JsonResponse> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readViewId(response: JsonResponse): Promise<string | null> {
  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null || !("id" in payload)) return null;
  const id = payload.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

function capDuration(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  if (seconds >= MAX_DURATION_SECONDS) return MAX_DURATION_SECONDS;
  return seconds;
}
