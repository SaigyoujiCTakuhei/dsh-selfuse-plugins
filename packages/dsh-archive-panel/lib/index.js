// dsh-archive-panel - host half.
// Loopback-only HTTP routes over the workspace registry's archived set:
//   POST /api/dsh-archive/unarchive - restore one archived session
//   POST /api/dsh-archive/unarchive-all - restore every archived session
//   POST /api/dsh-archive/unarchive-selected - restore the given archived sessions
//   POST /api/dsh-archive/delete    - permanently delete one archived session
//   GET  /api/dsh-archive/meta      - archived session metadata (createdAt/turns/size)
//   GET  /api/dsh-archive/detail    - preview a session's conversation history
//   POST /api/dsh-archive/delete-all - permanently delete every archived session
//   POST /api/dsh-archive/delete-selected - permanently delete the given archived sessions
// The registry has no public unarchive today, so we attach one idempotently and
// drive it through the registry's own serialized write path: in-memory state and
// the durable workspace domain stay consistent, and the emitted domain/changed
// event reaches the api-proxy, which pushes host/archived-sessions-changed to
// the browser automatically.

import { rm } from "node:fs/promises";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { zstdDecompressSync } from "node:zlib";

const UNARCHIVE_PATH = "/api/dsh-archive/unarchive";
const UNARCHIVE_ALL_PATH = "/api/dsh-archive/unarchive-all";
const UNARCHIVE_SELECTED_PATH = "/api/dsh-archive/unarchive-selected";
const DELETE_PATH = "/api/dsh-archive/delete";
const META_PATH = "/api/dsh-archive/meta";
const DETAIL_PATH = "/api/dsh-archive/detail";
const DELETE_ALL_PATH = "/api/dsh-archive/delete-all";
const DELETE_SELECTED_PATH = "/api/dsh-archive/delete-selected";
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

const ZSTD_MAGIC = 4247762216;

/** Recursively sum the byte size of a directory. */
function dirSize(dir) {
  let total = 0;
  if (!existsSync(dir)) return 0;
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) total += dirSize(full);
      else total += stat.size;
    }
  } catch { /* best effort */ }
  return total;
}

/** Scan concatenated zstd frames from a buffer (handles multi-frame logs). */
function scanZstdFrames(buffer) {
  const frames = [];
  let offset = 0;
  while (offset < buffer.length) {
    const start = offset;
    if (buffer.length - offset < 4) break;
    if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) break;
    offset += 4;
    if (offset === buffer.length) break;
    const descriptor = buffer.readUInt8(offset);
    offset += 1;
    if ((descriptor & 24) !== 0) break;
    const contentSizeFlag = descriptor >>> 6;
    const singleSegment = (descriptor & 32) !== 0;
    const dictionaryFlag = descriptor & 3;
    const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag;
    const contentSizeBytes = contentSizeFlag === 0 ? (singleSegment ? 1 : 0) : 1 << contentSizeFlag;
    const remainingHeaderBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes;
    if (buffer.length - offset < remainingHeaderBytes) break;
    offset += remainingHeaderBytes;
    for (;;) {
      if (buffer.length - offset < 3) break;
      const blockHeader = buffer.readUIntLE(offset, 3);
      offset += 3;
      const lastBlock = (blockHeader & 1) !== 0;
      const blockType = (blockHeader >>> 1) & 3;
      const blockSize = blockHeader >>> 3;
      if (blockType === 3) break;
      const payloadBytes = blockType === 1 ? 1 : blockSize;
      if (buffer.length - offset < payloadBytes) break;
      offset += payloadBytes;
      if (lastBlock) break;
    }
    if (descriptor & 4) {
      if (buffer.length - offset < 4) break;
      offset += 4;
    }
    frames.push({ start, end: offset });
  }
  return frames;
}

/** Decompress a (possibly multi-frame) zstd session log to UTF-8 text. */
function decodeZstdLog(filePath) {
  if (!existsSync(filePath)) return "";
  try {
    const buf = readFileSync(filePath);
    const frames = scanZstdFrames(buf);
    if (frames.length === 0) {
      try { return zstdDecompressSync(buf).toString("utf8"); } catch { return ""; }
    }
    const chunks = [];
    for (const { start, end } of frames) {
      try { chunks.push(zstdDecompressSync(buf.subarray(start, end))); } catch { /* tolerate */ }
    }
    return Buffer.concat(chunks).toString("utf8");
  } catch {
    return "";
  }
}

/** Read the raw transcript text from a session data directory. */
function readTranscriptText(dataDir) {
  const zstdPath = join(dataDir, "session.jsonl.zstd");
  const jsonlPath = join(dataDir, "session.jsonl");
  if (existsSync(zstdPath)) return decodeZstdLog(zstdPath);
  if (existsSync(jsonlPath)) {
    try { return readFileSync(jsonlPath, "utf8"); } catch { return ""; }
  }
  return "";
}

/** Count conversation turns (turn/start events) in a session's log. */
function countTurns(dataDir) {
  const rawText = readTranscriptText(dataDir);
  if (!rawText) return 0;
  let turns = 0;
  for (const line of rawText.split("\n")) {
    if (!line) continue;
    try {
      const ev = JSON.parse(line);
      if (ev.type === "turn/start") turns++;
    } catch { /* ignore */ }
  }
  return turns;
}

/** Extract user/assistant message cards for the preview modal. */
function extractSessionDetail(dataDir, maxMessages = 50) {
  const rawText = readTranscriptText(dataDir);
  if (!rawText) return { messages: [], totalMessages: 0 };
  let header = null;
  const messages = [];
  for (const line of rawText.split("\n")) {
    if (!line) continue;
    try {
      const ev = JSON.parse(line);
      if (ev.type === "session") {
        header = ev;
      } else if (ev.type === "user/message") {
        const contents = ev.data && ev.data.content ? ev.data.content : [];
        for (const item of contents) {
          if (item && item.type === "text" && typeof item.text === "string") {
            let clean = item.text;
            const reminderIdx = clean.indexOf("<system-reminder>");
            if (reminderIdx !== -1) clean = clean.slice(0, reminderIdx).trim();
            const runtimeIdx = clean.indexOf("Current runtime context.");
            if (runtimeIdx !== -1) clean = clean.slice(0, runtimeIdx).trim();
            if (clean) {
              messages.push({ role: "user", time: ev.time || (header && header.createdAt), content: clean });
            }
          }
        }
      } else if (ev.type === "assistant/message") {
        const contents = (ev.data && ev.data.message && ev.data.message.content) || [];
        const parts = [];
        for (const item of contents) {
          if (item && item.type === "text" && typeof item.text === "string" && item.text.trim()) parts.push(item.text.trim());
        }
        if (parts.length > 0) {
          messages.push({ role: "assistant", time: ev.time, content: parts.join("\n\n") });
        }
      }
    } catch { /* ignore */ }
  }
  return { messages: messages.slice(-maxMessages), totalMessages: messages.length };
}

/** Resolve a session's on-disk data directory via sessionPersistence. */
async function getDataDir(ctx, sessionId) {
  try {
    const headers = await ctx.sessionPersistence.list();
    const header = headers.find((candidate) => candidate.id === sessionId);
    if (header === undefined) return undefined;
    const location = ctx.sessionPersistence.locate(header);
    if (location === undefined || !location.path) return undefined;
    return dirname(location.path);
  } catch {
    return undefined;
  }
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

function makeMetaHandler(ctx) {
  return async (req, res) => {
    if (req.method !== "GET") { writeJson(res, 405, { ok: false, error: "method not allowed" }); return; }
    if (!isLoopbackRequest(req)) { writeJson(res, 403, { ok: false, error: "forbidden: loopback-only" }); return; }
    try {
      const archived = Array.isArray(ctx.workspaceRegistry.archivedSessionIds)
        ? [...ctx.workspaceRegistry.archivedSessionIds]
        : [];
      let headers = [];
      try { headers = await ctx.sessionPersistence.list(); } catch { headers = []; }
      const byId = new Map();
      for (const header of headers) {
        if (header && typeof header.id === "string") byId.set(header.id, header);
      }
      const items = archived.map((id) => {
        const header = byId.get(id);
        const createdAt = header && typeof header.createdAt === "number" ? header.createdAt : 0;
        let turns = 0;
        let dataSize = 0;
        try {
          if (header) {
            const location = ctx.sessionPersistence.locate(header);
            if (location && location.path) {
              const dataDir = dirname(location.path);
              if (existsSync(dataDir)) {
                dataSize = dirSize(dataDir);
                turns = countTurns(dataDir);
              }
            }
          }
        } catch { /* best effort */ }
        return { id, createdAt, turns, dataSize };
      });
      writeJson(res, 200, { ok: true, items });
    } catch (error) {
      writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  };
}

function makeDetailHandler(ctx) {
  return async (req, res) => {
    if (req.method !== "GET") { writeJson(res, 405, { ok: false, error: "method not allowed" }); return; }
    if (!isLoopbackRequest(req)) { writeJson(res, 403, { ok: false, error: "forbidden: loopback-only" }); return; }
    try {
      const url = new URL(req.url, "http://localhost");
      const sessionId = url.searchParams.get("sessionId");
      if (typeof sessionId !== "string" || sessionId.trim() === "") {
        writeJson(res, 400, { ok: false, error: "sessionId required" });
        return;
      }
      const dataDir = await getDataDir(ctx, sessionId.trim());
      if (dataDir === undefined) {
        writeJson(res, 404, { ok: false, error: "session data not found" });
        return;
      }
      const detail = extractSessionDetail(dataDir, 50);
      writeJson(res, 200, { ok: true, sessionId: sessionId.trim(), ...detail });
    } catch (error) {
      writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  };
}

/** Delete a batch of archived sessions, continuing past per-session failures. */
async function deleteManyPermanently(ctx, ids) {
  let removed = 0;
  const errors = [];
  for (const id of ids) {
    try {
      await deleteSessionPermanently(ctx, id);
      removed++;
    } catch (error) {
      errors.push(id + ": " + (error instanceof Error ? error.message : String(error)));
    }
  }
  return { removed, total: ids.length, errors };
}

function makeDeleteAllHandler(ctx) {
  return async (req, res) => {
    if (req.method !== "POST") { writeJson(res, 405, { ok: false, error: "method not allowed" }); return; }
    if (!isLoopbackRequest(req)) { writeJson(res, 403, { ok: false, error: "forbidden: loopback-only" }); return; }
    try {
      const archived = Array.isArray(ctx.workspaceRegistry.archivedSessionIds)
        ? [...ctx.workspaceRegistry.archivedSessionIds]
        : [];
      const outcome = await deleteManyPermanently(ctx, archived);
      writeJson(res, 200, { ok: true, removed: outcome.removed, total: outcome.total, errors: outcome.errors });
    } catch (error) {
      writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  };
}

function makeDeleteSelectedHandler(ctx) {
  return async (req, res) => {
    if (req.method !== "POST") { writeJson(res, 405, { ok: false, error: "method not allowed" }); return; }
    if (!isLoopbackRequest(req)) { writeJson(res, 403, { ok: false, error: "forbidden: loopback-only" }); return; }
    const body = await readJsonBody(req);
    const raw = body && Array.isArray(body.sessionIds) ? body.sessionIds : [];
    const requested = [];
    for (const id of raw) {
      const trimmed = typeof id === "string" ? id.trim() : "";
      if (trimmed !== "" && requested.indexOf(trimmed) === -1) requested.push(trimmed);
    }
    if (requested.length === 0) { writeJson(res, 400, { ok: false, error: "sessionIds is required" }); return; }
    try {
      // Only honor ids that are currently archived, mirroring the panel's own scope.
      const archived = Array.isArray(ctx.workspaceRegistry.archivedSessionIds)
        ? [...ctx.workspaceRegistry.archivedSessionIds]
        : [];
      const targets = requested.filter((id) => archived.includes(id));
      if (targets.length === 0) { writeJson(res, 400, { ok: false, error: "没有匹配的归档会话" }); return; }
      const outcome = await deleteManyPermanently(ctx, targets);
      writeJson(res, 200, { ok: true, removed: outcome.removed, total: outcome.total, errors: outcome.errors });
    } catch (error) {
      writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  };
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

/** Restore a batch of archived sessions, continuing past per-session failures. */
async function unarchiveMany(ctx, ids) {
  let restored = 0;
  const errors = [];
  for (const id of ids) {
    try {
      await ctx.workspaceRegistry.unarchiveSession(id);
      restored++;
    } catch (error) {
      errors.push(id + ": " + (error instanceof Error ? error.message : String(error)));
    }
  }
  return { restored, total: ids.length, errors };
}

function makeUnarchiveAllHandler(ctx) {
  return async (req, res) => {
    if (req.method !== "POST") { writeJson(res, 405, { ok: false, error: "method not allowed" }); return; }
    if (!isLoopbackRequest(req)) { writeJson(res, 403, { ok: false, error: "forbidden: loopback-only" }); return; }
    try {
      const archived = Array.isArray(ctx.workspaceRegistry.archivedSessionIds)
        ? [...ctx.workspaceRegistry.archivedSessionIds]
        : [];
      const outcome = await unarchiveMany(ctx, archived);
      writeJson(res, 200, { ok: true, restored: outcome.restored, total: outcome.total, errors: outcome.errors });
    } catch (error) {
      writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  };
}

function makeUnarchiveSelectedHandler(ctx) {
  return async (req, res) => {
    if (req.method !== "POST") { writeJson(res, 405, { ok: false, error: "method not allowed" }); return; }
    if (!isLoopbackRequest(req)) { writeJson(res, 403, { ok: false, error: "forbidden: loopback-only" }); return; }
    const body = await readJsonBody(req);
    const raw = body && Array.isArray(body.sessionIds) ? body.sessionIds : [];
    const requested = [];
    for (const id of raw) {
      const trimmed = typeof id === "string" ? id.trim() : "";
      if (trimmed !== "" && requested.indexOf(trimmed) === -1) requested.push(trimmed);
    }
    if (requested.length === 0) { writeJson(res, 400, { ok: false, error: "sessionIds is required" }); return; }
    try {
      // Only honor ids that are currently archived, mirroring the panel's own scope.
      const archived = Array.isArray(ctx.workspaceRegistry.archivedSessionIds)
        ? [...ctx.workspaceRegistry.archivedSessionIds]
        : [];
      const targets = requested.filter((id) => archived.includes(id));
      if (targets.length === 0) { writeJson(res, 400, { ok: false, error: "没有匹配的归档会话" }); return; }
      const outcome = await unarchiveMany(ctx, targets);
      writeJson(res, 200, { ok: true, restored: outcome.restored, total: outcome.total, errors: outcome.errors });
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
      ctx.webServer.register({ kind: "exact", path: UNARCHIVE_ALL_PATH, handler: makeUnarchiveAllHandler(ctx) }),
      ctx.webServer.register({ kind: "exact", path: UNARCHIVE_SELECTED_PATH, handler: makeUnarchiveSelectedHandler(ctx) }),
      ctx.webServer.register({ kind: "exact", path: DELETE_PATH, handler: makeDeleteHandler(ctx) }),
      ctx.webServer.register({ kind: "exact", path: META_PATH, handler: makeMetaHandler(ctx) }),
      ctx.webServer.register({ kind: "exact", path: DETAIL_PATH, handler: makeDetailHandler(ctx) }),
      ctx.webServer.register({ kind: "exact", path: DELETE_ALL_PATH, handler: makeDeleteAllHandler(ctx) }),
      ctx.webServer.register({ kind: "exact", path: DELETE_SELECTED_PATH, handler: makeDeleteSelectedHandler(ctx) })
    ];
    return () => {
      for (const dispose of disposers) dispose();
    };
  }, "dsh-archive-panel: routes");
}

export { apply, inject };
