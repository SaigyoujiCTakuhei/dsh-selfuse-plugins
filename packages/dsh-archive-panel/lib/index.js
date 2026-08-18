// dsh-archive-panel - host half.
// Adds a loopback-only HTTP route that removes a session from the workspace
// registry archive set. The registry has no public unarchive today, so we
// attach one idempotently and drive it through the registry's own serialized
// write path: in-memory state and the durable workspace domain stay consistent,
// and the emitted domain/changed event reaches the api-proxy, which pushes
// host/archived-sessions-changed to the browser automatically.

const API_PATH = "/api/dsh-archive/unarchive";
const MAX_BODY_BYTES = 64 * 1024;

const inject = ["webServer", "workspaceRegistry"];

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

function apply(ctx) {
  ensureUnarchive(ctx.workspaceRegistry);
  ctx.effect(() => {
    const dispose = ctx.webServer.register({
      kind: "exact",
      path: API_PATH,
      handler: async (req, res) => {
        if (req.method !== "POST") {
          writeJson(res, 405, { ok: false, error: "method not allowed" });
          return;
        }
        if (!isLoopbackRequest(req)) {
          writeJson(res, 403, { ok: false, error: "forbidden: loopback-only" });
          return;
        }
        const body = await readJsonBody(req);
        const sessionId = body && typeof body.sessionId === "string" ? body.sessionId.trim() : "";
        if (sessionId === "") {
          writeJson(res, 400, { ok: false, error: "sessionId is required" });
          return;
        }
        try {
          await ctx.workspaceRegistry.unarchiveSession(sessionId);
          writeJson(res, 200, { ok: true, archivedSessionIds: [...ctx.workspaceRegistry.archivedSessionIds] });
        } catch (error) {
          writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
        }
      }
    });
    return () => dispose();
  }, "dsh-archive-panel: routes");
}

export { apply, inject };
