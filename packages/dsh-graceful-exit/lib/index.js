/**
 * dsh-graceful-exit — host half.
 *
 * One feature: graceful exit of the dsh process, equivalent to pressing
 * Ctrl+C in the terminal that runs `dsh web`.
 *
 * The profile boot registers the process's shutdown path explicitly:
 *
 *     process.on("SIGINT", () => interrupt(130));
 *     interrupt = (code) => { signalShutdown.abort(); shutdown.interrupt(code); }
 *
 * so delivering SIGINT to our own pid runs the EXACT same handler as the
 * terminal interrupt (abort + fiber dispose + exit code 130) — there is no
 * cleaner "quit" API to call. A loopback-only POST route exposes that to the
 * browser half: the ack is written first, then the signal is scheduled a
 * moment later so the response has time to flush before the process dies.
 *
 * POST-only by design: a GET here would be one link-prefetch away from
 * killing dsh. The loopback guard mirrors dsh-context-compression-status.
 */
const name = "dsh-graceful-exit";
const inject = ["webServer"];

const ROUTE_PATH = "/api/dsh-graceful-exit/shutdown";

/** Delay (ms) between flushing the ack and delivering SIGINT. */
const KILL_DELAY_MS = 150;

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

/**
 * Build the shutdown route handler. Loopback-only; answers `{ok:true}` and
 * then sends this process SIGINT (the terminal Ctrl+C handler). Idempotent:
 * once the signal is scheduled, repeat calls just get the same ack.
 * @param ctx - the plugin context.
 * @returns the HTTP handler (async).
 */
function makeShutdownHandler(ctx) {
  let scheduled = false;
  return async (req, res) => {
    if (!isLoopbackRequest(req)) {
      writeJson(res, 403, { ok: false, error: "forbidden" });
      return;
    }
    if (req.method !== "POST") {
      writeJson(res, 405, { ok: false, error: "POST only" });
      return;
    }
    writeJson(res, 200, { ok: true, pid: process.pid, signal: "SIGINT" });
    if (scheduled) return;
    scheduled = true;
    ctx.logger?.info?.(
      `dsh-graceful-exit: shutdown requested via web UI — sending SIGINT to pid ${process.pid}`,
    );
    setTimeout(() => {
      process.kill(process.pid, "SIGINT");
    }, KILL_DELAY_MS);
  };
}

/**
 * Register the shutdown route as an effect on this plugin's fiber, so
 * unloading the plugin removes the route.
 * @param ctx - the plugin context.
 */
function apply(ctx) {
  ctx.effect(() => {
    const dispose = ctx.webServer.register({
      kind: "exact",
      path: ROUTE_PATH,
      handler: makeShutdownHandler(ctx),
    });
    return () => dispose();
  }, "dsh-graceful-exit: route");
}

export { apply, inject, name, makeShutdownHandler, isLoopbackRequest, ROUTE_PATH, KILL_DELAY_MS };
