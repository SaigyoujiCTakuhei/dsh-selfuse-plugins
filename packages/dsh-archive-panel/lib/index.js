// dsh-archive-panel - host half.
// Loopback-only HTTP routes over the workspace registry's archived set:
//   POST /api/dsh-archive/unarchive - restore one archived session
//   POST /api/dsh-archive/delete    - permanently delete one archived session
// The registry has no public unarchive today, so we attach one idempotently and
// drive it through the registry's own serialized write path: in-memory state and
// the durable workspace domain stay consistent, and the emitted domain/changed
// event reaches the api-proxy, which pushes host/archived-sessions-changed to
// the browser automatically.

import { rm } from "node:fs/promises";
import { dirname } from "node:path";

const UNARCHIVE_PATH = "/api/dsh-archive/unarchive";
const DELETE_PATH = "/api/dsh-archive/delete";
const MAX_BODY_BYTES = 64 * 1024;

const inject = ["webServer", "workspaceRegistry", "sessionPersistence"];

class SessionLiveError extends Error {
  constructor(sessionId) {
    super("会话 " + sessionId + " 正在运行，无法删除：请先停止该会话");
    this.name = "SessionLiveError";
  }
}

function writeJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "referrer-policy": "no-referrer",
    "cache-control": "no-store"
  });
  res.end(payload);
}

function isLoopbackRequest(request) {
  const address = request.socket && request.socket.remoteAddress;
  if (address !== "127.0.0.1" && address !== "::1" && address !== "::ffff:127.0.0.1") return false;
  const host = request.headers && request.headers.host;
  if (typeof host !== "string") return false;
  let hostUrl;
  try { hostUrl = new URL("http://" + host); } catch { return false; }
  if (hostUrl.hostname !== "127.0.0.1" && hostUrl.hostname !== "localhost" && hostUrl.hostname !== "[::1]") return false;
  if (request.headers["sec-fetch-site"] === "cross-site") return false;
  const origin = request.headers.origin;
  if (origin === undefined) return true;
  try { return new URL(origin).host === hostUrl.host; } catch { return false; }
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) return undefined;
    chunks.push(chunk);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return typeof parsed === "object" && parsed !== null ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function readSessionId(req) {
  const body = await readJsonBody(req);
  const sessionId = body && typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  return sessionId === "" ? null : sessionId;
}

function ensureUnarchive(registry) {
  if (typeof registry.unarchiveSession === "function") return;
  registry.unarchiveSession = function unarchiveSession(sessionId) {
    return this.enqueueOperation(async () => {
      const state = this.requireState();
      if (!state.archivedSessionIds.includes(sessionId)) return;
      await this.setState({
        ...state,
        archivedSessionIds: state.archivedSessionIds.filter((id) => id !== sessionId)
      });
    });
  };
}

async function deleteSessionPermanently(ctx, sessionId) {
  // An archived session has been explicitly set aside by the user and is the
  // ONLY thing this panel offers to delete, so it must always be deletable —
  // even though the runtime may still hold a (typically idle) agent reference
  // for it. Archiving does not tear the agent down, so testing liveness against
  // ctx.agents would wrongly block archived deletions with the "正在运行" error.
  // We therefore skip the liveness guard for archived sessions entirely, and
  // only refuse deletion for a NON-archived session that is genuinely running.
  const archivedSessionIds = Array.isArray(ctx.workspaceRegistry.archivedSessionIds)
    ? ctx.workspaceRegistry.archivedSessionIds
    : [];
  const isArchived = archivedSessionIds.includes(sessionId);

  if (!isArchived) {
    // Refuse to delete a session that is still live (a running agent owns it).
    // Use the LIVE-AGENT registry (ctx.agents), not the in-memory session store
    // (ctx.sessions): the latter keeps a Session record for every loaded session,
    // so it cannot distinguish "running" from "merely loaded". ctx.agents.get
    // returns an agent only while one is genuinely bound to this sessionId.
    let live;
    try {
      const agents = ctx.get("agents");
      live = agents && typeof agents.get === "function" ? agents.get(sessionId) : undefined;
    } catch {
      live = undefined;
    }
    if (live !== undefined) throw new SessionLiveError(sessionId);
  }

  // 1) Remove from the archived set (keeps registry/domain in sync).
  await ctx.workspaceRegistry.unarchiveSession(sessionId);

  // 2) Detach from workspace accounting so it never reappears in a group.
  for (const workspace of ctx.workspaceRegistry.list()) {
    if (workspace.sessionIds.includes(sessionId)) {
      await workspace.detachSession(sessionId);
      break;
    }
  }

  // 3) Delete the persisted session artifact (its whole session dir).
  const warnings = [];
  let removed = false;
  try {
    const headers = await ctx.sessionPersistence.list();
    const header = headers.find((candidate) => candidate.id === sessionId);
    if (header !== undefined) {
      const location = ctx.sessionPersistence.locate(header);
      if (location !== undefined && location.path) {
        await rm(dirname(location.path), { recursive: true, force: true });
        removed = true;
      }
    }
  } catch (error) {
    warnings.push("会话日志删除失败：" + (error instanceof Error ? error.message : String(error)));
  }

  // 4) Drop cached header/path references so the id cannot be resurrected.
  const registry = ctx.workspaceRegistry;
  if (registry.headers && typeof registry.headers.delete === "function") registry.headers.delete(sessionId);
  if (registry.sessionPaths && typeof registry.sessionPaths.delete === "function") registry.sessionPaths.delete(sessionId);
  if (registry.invalidSessionPaths && typeof registry.invalidSessionPaths.delete === "function") registry.invalidSessionPaths.delete(sessionId);

  // 5) Evict from the in-memory session store so the left workspace bar stops
  // showing the session. The store exposes NO public remove-by-id API — its only
  // eviction path is the private `enter` disposer. We replicate that effect:
  // drop the record and emit `session/disposed` (the api-proxy forwards it as
  // `host/session-removed`, which makes the client drop the row). Guarded so a
  // future dsh internal change can never turn an otherwise-successful delete
  // into an error.
  try {
    const sessions = ctx.get("sessions");
    if (sessions && typeof sessions.get === "function") {
      const session = sessions.get(sessionId);
      const store = sessions.store;
      if (store && typeof store.delete === "function") store.delete(sessionId);
      if (session !== undefined) {
        try { ctx.emit("session/disposed", session); } catch { /* best effort */ }
      }
    }
  } catch {
    /* best effort: the data-layer deletion above already succeeded */
  }

  return { removed, warnings };
}

function makeUnarchiveHandler(ctx) {
  return async (req, res) => {
    if (req.method !== "POST") { writeJson(res, 405, { ok: false, error: "method not allowed" }); return; }
    if (!isLoopbackRequest(req)) { writeJson(res, 403, { ok: false, error: "forbidden: loopback-only" }); return; }
    const sessionId = await readSessionId(req);
    if (sessionId === null) { writeJson(res, 400, { ok: false, error: "sessionId is required" }); return; }
    try {
      await ctx.workspaceRegistry.unarchiveSession(sessionId);
      writeJson(res, 200, { ok: true, archivedSessionIds: [...ctx.workspaceRegistry.archivedSessionIds] });
    } catch (error) {
      writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  };
}

function makeDeleteHandler(ctx) {
  return async (req, res) => {
    if (req.method !== "POST") { writeJson(res, 405, { ok: false, error: "method not allowed" }); return; }
    if (!isLoopbackRequest(req)) { writeJson(res, 403, { ok: false, error: "forbidden: loopback-only" }); return; }
    const sessionId = await readSessionId(req);
    if (sessionId === null) { writeJson(res, 400, { ok: false, error: "sessionId is required" }); return; }
    try {
      const outcome = await deleteSessionPermanently(ctx, sessionId);
      writeJson(res, 200, {
        ok: true,
        removed: outcome.removed,
        warnings: outcome.warnings,
        archivedSessionIds: [...ctx.workspaceRegistry.archivedSessionIds]
      });
    } catch (error) {
      const status = error instanceof SessionLiveError ? 409 : 500;
      writeJson(res, status, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  };
}

function apply(ctx) {
  ensureUnarchive(ctx.workspaceRegistry);
  ctx.effect(() => {
    const disposers = [
      ctx.webServer.register({ kind: "exact", path: UNARCHIVE_PATH, handler: makeUnarchiveHandler(ctx) }),
      ctx.webServer.register({ kind: "exact", path: DELETE_PATH, handler: makeDeleteHandler(ctx) })
    ];
    return () => {
      for (const dispose of disposers) dispose();
    };
  }, "dsh-archive-panel: routes");
}

export { apply, inject };
