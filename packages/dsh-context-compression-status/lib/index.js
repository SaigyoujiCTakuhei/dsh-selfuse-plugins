/**
 * dsh-context-compression-status — host half.
 *
 * Two cooperating parts:
 *
 * 1. A `contextCompaction` session-projection unit that folds the durable
 *    session log and records how many successful compactions have run and the
 *    details of the most recent one. dsh emits `compaction/summary` only on a
 *    *successful* compaction, so counting it yields the real compression count.
 *
 * 2. A loopback-only HTTP route `/api/dsh-context-compression/status` that
 *    surfaces that value to the browser. This is necessary because
 *    `dsh-client-connection` only forwards a HARDCODED allowlist of projection
 *    keys to the client (`contextPressure`, `tokenUsage`, `contextBreakdown`,
 *    `sessionStats`, …) — a custom plugin projection registered via
 *    `ctx.sessionProjections` is computed on the host but never pushed to the
 *    client. The route (mirroring `dsh-archive-panel`) is the supported way for
 *    a static plugin to deliver host-computed, per-session data to the GUI.
 *
 * The unit carries a `schema` because the session-projection registry runs
 * `schema.parse(view(state))` on every snapshot. We hand-roll it (no `zod`) so
 * the host half stays dependency-free and resolves cleanly even when the
 * package is symlinked into a profile.
 */
const name = "dsh-context-compression-status";
const inject = ["sessionProjections", "webServer", "sessions"];

const ROUTE_PATH = "/api/dsh-context-compression/status";

/**
 * Validate and normalize a view output. Throws on a malformed shape so a bad
 * cell can never poison a snapshot, and coerces nullable fields to the exact
 * types the browser half expects.
 * @param value - the raw view object.
 * @returns the validated, normalized projection value.
 */
function parse(value) {
  if (value === null || typeof value !== "object") {
    throw new Error("contextCompaction: view must be an object");
  }
  const count = Number(value.compactionCount);
  if (!Number.isInteger(count) || count < 0) {
    throw new Error("contextCompaction: compactionCount must be a non-negative integer");
  }
  const compressed = value.compressed === true;
  let last = null;
  const lc = value.lastCompaction;
  if (lc !== null && lc !== undefined) {
    last = {
      compactionId: typeof lc.compactionId === "string" ? lc.compactionId : "",
      seq: typeof lc.seq === "number" ? lc.seq : -1,
      shadowedTokenCount: lc.shadowedTokenCount == null ? null : Number(lc.shadowedTokenCount),
      provider: lc.provider == null ? null : String(lc.provider),
      model: lc.model == null ? null : String(lc.model),
      maxTokens: lc.maxTokens == null ? null : Number(lc.maxTokens),
      shadowedStart: lc.shadowedStart == null ? null : Number(lc.shadowedStart),
      shadowedEnd: lc.shadowedEnd == null ? null : Number(lc.shadowedEnd),
    };
  }
  return { compactionCount: count, compressed, lastCompaction: last };
}

/**
 * Build the projection unit. Pure, returns a fresh definition each call so a
 * reload registers cleanly.
 * @returns the session-projection definition for `contextCompaction`.
 */
function makeUnit() {
  return {
    key: "contextCompaction",
    schema: { parse },
    init: () => ({ count: 0, last: null }),
    apply: (state, event) => {
      if (event.type !== "compaction/summary") return state;
      const d = event.data ?? {};
      const range = d.shadowedRange ?? {};
      return {
        count: state.count + 1,
        last: {
          compactionId: typeof d.compactionId === "string" ? d.compactionId : "",
          seq: typeof event.seq === "number" ? event.seq : -1,
          shadowedTokenCount:
            typeof d.shadowedTokenCount === "number" ? d.shadowedTokenCount : null,
          provider: typeof d.provider === "string" ? d.provider : null,
          model: typeof d.model === "string" ? d.model : null,
          maxTokens: typeof d.maxTokens === "number" ? d.maxTokens : null,
          shadowedStart: typeof range.start === "number" ? range.start : null,
          shadowedEnd: typeof range.end === "number" ? range.end : null,
        },
      };
    },
    view: (state) => ({
      compactionCount: state.count,
      compressed: state.count > 0,
      lastCompaction: state.last,
    }),
    stateVersion: 1,
  };
}

// ---- loopback HTTP route (mirrors dsh-archive-panel) -----------------------

function writeJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "referrer-policy": "no-referrer",
    "cache-control": "no-store",
  });
  res.end(payload);
}

function isLoopbackRequest(request) {
  const address = request.socket && request.socket.remoteAddress;
  if (address !== "127.0.0.1" && address !== "::1" && address !== "::ffff:127.0.0.1") return false;
  const host = request.headers && request.headers.host;
  if (typeof host !== "string") return false;
  let hostUrl;
  try {
    hostUrl = new URL("http://" + host);
  } catch {
    return false;
  }
  if (hostUrl.hostname !== "127.0.0.1" && hostUrl.hostname !== "localhost" && hostUrl.hostname !== "[::1]") {
    return false;
  }
  if (request.headers["sec-fetch-site"] === "cross-site") return false;
  const origin = request.headers.origin;
  if (origin === undefined) return true;
  try {
    return new URL(origin).host === hostUrl.host;
  } catch {
    return false;
  }
}

const EMPTY = { compactionCount: 0, compressed: false, lastCompaction: null };

/**
 * Build the route handler. Reads `?sessionId=`, resolves the session, and
 * returns its `contextCompaction` projection value (fail-soft to the empty
 * shape so the client never breaks on a missing session/projection).
 * @param ctx - the plugin context (resolves `sessions` and `sessionProjections`).
 * @returns the HTTP handler.
 */
function makeStatusHandler(ctx) {
  return (req, res) => {
    if (!isLoopbackRequest(req)) {
      writeJson(res, 403, { ok: false, error: "forbidden" });
      return;
    }
    let sessionId = null;
    try {
      const url = new URL(req.url, "http://localhost");
      sessionId = url.searchParams.get("sessionId");
    } catch {
      /* ignore */
    }
    if (typeof sessionId !== "string" || sessionId === "") {
      writeJson(res, 400, { ok: false, error: "sessionId required" });
      return;
    }
    const sessions = ctx.get("sessions");
    const registry = ctx.get("sessionProjections");
    if (sessions === undefined || registry === undefined) {
      writeJson(res, 503, { ok: false, error: "service unavailable" });
      return;
    }
    const session = sessions.get(sessionId);
    if (session === undefined) {
      writeJson(res, 404, { ok: false, error: "session not found" });
      return;
    }
    let value = EMPTY;
    try {
      const snap = registry.snapshot(session);
      const found = snap.values.contextCompaction;
      if (found !== undefined) value = found;
    } catch (error) {
      ctx.logger?.warn?.(
        `dsh-context-compression-status: snapshot for "${sessionId}" failed: ${String(error)}`,
      );
    }
    writeJson(res, 200, { ok: true, ...value });
  };
}

/**
 * Register both the projection unit and the status route. Each is an effect on
 * this plugin's fiber, so unloading the plugin removes both.
 * @param ctx - the plugin context.
 */
function apply(ctx) {
  ctx.sessionProjections.register(makeUnit());
  ctx.effect(() => {
    const dispose = ctx.webServer.register({
      kind: "exact",
      path: ROUTE_PATH,
      handler: makeStatusHandler(ctx),
    });
    return () => dispose();
  }, "dsh-context-compression-status: route");
}

export { apply, inject, name, makeUnit, makeStatusHandler };
