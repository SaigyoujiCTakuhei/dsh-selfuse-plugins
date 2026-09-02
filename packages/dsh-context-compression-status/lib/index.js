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
 *    surfaces that value — plus the effective AUTO-compaction threshold — to
 *    the browser. The trigger point is `floor(contextWindow * ratio)` against
 *    the routed target the session's last `request/context` event records;
 *    the ratio is dsh's default `thresholdRatio` (0.8), mirrored as a
 *    constant because on the web surface `compaction-basic` is DISABLED on
 *    the host plane and mounted inside per-session agent-preset realms
 *    instead — a host plugin can neither inject nor `ctx.get` that instance
 *    (declaring it only parks this plugin forever: boot fails with
 *    "waiting for service: compaction"). The default IS the effective policy
 *    for this deployment: every shipped preset and the user's own presets
 *    mount `compaction-basic` with no config. This is necessary because
 *    `dsh-client-connection` only forwards a HARDCODED allowlist of projection
 *    keys to the client (`contextPressure`, `tokenUsage`, `contextBreakdown`,
 *    `sessionStats`, …) — a custom plugin projection registered via
 *    `ctx.sessionProjections` is computed on the host but never pushed to the
 *    client. The route (mirroring `dsh-archive-panel`) is the supported way for
 *    a static plugin to deliver host-computed, per-session data to the GUI.
 *
 * The unit carries a `wire` block (`viewSchema` + `view`) because, since dsh
 * 0.1.1-rc.2, the session-projection registry reads
 * `wire.viewSchema.parse(wire.view(state))` on every snapshot/restore. The old
 * top-level `schema`/`view` keys are ignored. Both schemas are hand-rolled
 * (no `zod`) so the host half stays dependency-free and resolves cleanly even
 * when the package is symlinked into a profile. The `stateSchema` is not
 * optional hygiene either: `registry.restore()` calls
 * `stateSchema.parse(row.val)` on a version-matched cached row, so a unit
 * without one turns every warm cold-read into a thrown TypeError and a full
 * log re-read (the slow rung of `coldSnapshot`'s ladder).
 */
const name = "dsh-context-compression-status";
const inject = ["sessionProjections", "webServer", "sessions", "sessionProjectionCache"];

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
  let routed = null;
  if (value.routed !== null && value.routed !== undefined) {
    if (typeof value.routed !== "object") {
      throw new Error("contextCompaction: routed must be an object or null");
    }
    const r = value.routed;
    if (typeof r.provider !== "string" || r.provider === "" || typeof r.model !== "string" || r.model === "") {
      throw new Error("contextCompaction: routed must carry non-empty provider/model");
    }
    routed = {
      provider: r.provider,
      model: r.model,
      contextWindow: typeof r.contextWindow === "number" && Number.isFinite(r.contextWindow) ? r.contextWindow : null,
    };
  }
  return { compactionCount: count, compressed, lastCompaction: last, routed };
}

/**
 * Validate/normalize a persisted fold state. Registered as the unit's
 * `stateSchema.parse` — the registry runs it on every version-matched cached
 * row during cold restore, and on malformed rows a throw is the correct
 * outcome (the row is discarded and the key refolds from `init`).
 * @param value - the raw fold state.
 * @returns the validated state.
 */
function parseState(value) {
  if (value === null || typeof value !== "object") {
    throw new Error("contextCompaction: state must be an object");
  }
  const count = Number(value.count);
  if (!Number.isInteger(count) || count < 0) {
    throw new Error("contextCompaction: state.count must be a non-negative integer");
  }
  let last = null;
  if (value.last !== null && value.last !== undefined) {
    if (typeof value.last !== "object") {
      throw new Error("contextCompaction: state.last must be an object or null");
    }
    const l = value.last;
    last = {
      compactionId: typeof l.compactionId === "string" ? l.compactionId : "",
      seq: typeof l.seq === "number" ? l.seq : -1,
      shadowedTokenCount: l.shadowedTokenCount == null ? null : Number(l.shadowedTokenCount),
      provider: l.provider == null ? null : String(l.provider),
      model: l.model == null ? null : String(l.model),
      maxTokens: l.maxTokens == null ? null : Number(l.maxTokens),
      shadowedStart: l.shadowedStart == null ? null : Number(l.shadowedStart),
      shadowedEnd: l.shadowedEnd == null ? null : Number(l.shadowedEnd),
    };
  }
  let routed = null;
  if (value.routed !== null && value.routed !== undefined) {
    if (typeof value.routed !== "object") {
      throw new Error("contextCompaction: state.routed must be an object or null");
    }
    const r = value.routed;
    if (typeof r.provider !== "string" || r.provider === "" || typeof r.model !== "string" || r.model === "") {
      throw new Error("contextCompaction: state.routed must carry non-empty provider/model");
    }
    routed = {
      provider: r.provider,
      model: r.model,
      contextWindow: typeof r.contextWindow === "number" && Number.isFinite(r.contextWindow) ? r.contextWindow : null,
    };
  }
  return { count, last, routed };
}

/**
 * Build the projection unit. Pure, returns a fresh definition each call so a
 * reload registers cleanly.
 * @returns the session-projection definition for `contextCompaction`.
 */
function makeUnit() {
  return {
    key: "contextCompaction",
    init: () => ({ count: 0, last: null, routed: null }),
    apply: (state, event) => {
      // The routed target the trigger measures against: the engine resolves
      // its policy and capacity from exactly this provider/model pair.
      if (event.type === "request/context") {
        const d = event.data ?? {};
        if (typeof d.provider !== "string" || d.provider === "" || typeof d.model !== "string" || d.model === "") {
          return state;
        }
        return {
          ...state,
          routed: {
            provider: d.provider,
            model: d.model,
            contextWindow: typeof d.contextWindow === "number" ? d.contextWindow : null,
          },
        };
      }
      if (event.type !== "compaction/summary") return state;
      const d = event.data ?? {};
      const range = d.shadowedRange ?? {};
      return {
        ...state,
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
    // dsh 0.1.1-rc.2 contract: the registry reads `wire.viewSchema.parse(
    // wire.view(state))` on every snapshot. The old top-level `schema`/`view`
    // keys are IGNORED, so omitting `wire` made every snapshot throw (and the
    // route's try/catch swallow it into an empty value → count stuck at 0).
    wire: {
      viewSchema: { parse },
      view: (state) => ({
        compactionCount: state.count,
        compressed: state.count > 0,
        lastCompaction: state.last,
        routed: state.routed,
      }),
    },
    stateSchema: { parse: parseState },
    // v2: state gained `routed` (last request/context). v1 rows are unusable
    // by design and refold from `init` over the full durable log.
    stateVersion: 2,
  };
}

// ---- auto-compaction threshold (dsh default policy mirror) -----------------

/**
 * dsh's documented default compaction policy (`dsh-compaction-basic`
 * `resolveConfig` defaults). On the web surface `dsh-web-app`'s bundle patch
 * DISABLES the host-plane `compaction-basic` row and every agent preset
 * mounts it inside an isolated per-session realm, so the engine instance is
 * unreachable from a host plugin: cordis injects all-or-nothing (a declared
 * service that never appears keeps the fiber pending — the boot asserts
 * activation and dies), and the sandbox rejects `ctx.get` of any service not
 * declared in `inject`. These defaults are nonetheless the EFFECTIVE policy
 * for this deployment: every shipped preset and the user's own presets mount
 * `compaction-basic` with no config, and `resolveConfig` fills exactly these
 * values. If a preset one day overrides `thresholdRatio`, this mirror goes
 * stale — the bubble labels the percentage 默认 to keep that visible.
 */
const DEFAULT_THRESHOLD_RATIO = 0.8;

/**
 * Resolve the auto-compaction threshold for one session, mirroring
 * `resolveTargetPolicy` + `resolveCompactSpec` in `dsh-compaction-basic`:
 * the default `thresholdRatio` scaled by the routed target's context window.
 * @param routed - the routed target from the projection (may be null before
 *   the session's first request).
 * @returns `{auto, ratio, tokens, contextWindow}`; `tokens`/`contextWindow`
 *   are null until the session has a routed context window. A preset without
 *   `compaction-basic` (e.g. data-agent) never compacts, so its displayed
 *   threshold is declarative, not enforced.
 */
function resolveAutoCompaction(routed) {
  const contextWindow = routed !== null && routed !== undefined && typeof routed.contextWindow === "number"
    ? routed.contextWindow
    : null;
  const tokens = contextWindow !== null ? Math.floor(contextWindow * DEFAULT_THRESHOLD_RATIO) : null;
  return { auto: true, ratio: DEFAULT_THRESHOLD_RATIO, tokens, contextWindow };
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

const EMPTY = {
  compactionCount: 0,
  compressed: false,
  lastCompaction: null,
  routed: null,
};

/**
 * Build the route handler. Reads `?sessionId=`, resolves the session, and
 * returns its `contextCompaction` projection value plus the effective
 * auto-compaction threshold (fail-soft to the empty shape so the client never
 * breaks on a missing session/projection/service).
 *
 * Resolution prefers the in-memory, attached session (`sessions.get` +
 * `sessionProjections.snapshot`) for live accuracy, and falls back to a cold
 * read (`sessionProjectionCache.coldSnapshot`) when the session is not
 * currently attached — e.g. the user opened a past session from history, or it
 * detached after the view. `sessions.get` only returns live/attached sessions,
 * so without the cold fallback the route would 404 for exactly the session the
 * user is inspecting, leaving the badge stuck on "未压缩".
 * @param ctx - the plugin context.
 * @returns the HTTP handler (async).
 */
function makeStatusHandler(ctx) {
  return async (req, res) => {
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
    const cache = ctx.get("sessionProjectionCache");
    if (registry === undefined) {
      writeJson(res, 503, { ok: false, error: "service unavailable" });
      return;
    }
    let value = EMPTY;
    try {
      const live = sessions !== undefined ? sessions.get(sessionId) : undefined;
      if (live !== undefined) {
        const snap = registry.snapshot(live);
        const found = snap.values.contextCompaction;
        if (found !== undefined) value = found;
      } else if (cache !== undefined) {
        const snap = await cache.coldSnapshot(sessionId, req.signal);
        const found = snap.values.contextCompaction;
        if (found !== undefined) value = found;
      } else {
        writeJson(res, 404, { ok: false, error: "session not found" });
        return;
      }
    } catch (error) {
      ctx.logger?.warn?.(
        `dsh-context-compression-status: resolve "${sessionId}" failed: ${String(error)}`,
      );
    }
    const autoCompaction = resolveAutoCompaction(value.routed);
    writeJson(res, 200, { ok: true, ...value, autoCompaction });
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

export { apply, inject, name, makeUnit, makeStatusHandler, resolveAutoCompaction, parseState };
