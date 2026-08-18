// dsh-plugin-updater - host half.
//
// Loopback-only HTTP routes over the host Cordis Loader and the profile's
// package manager:
//   GET  /api/dsh-plugin-updater/catalog  - Loader inventory with
//                                           builtin/third-party classification
//   GET  /api/dsh-plugin-updater/updates  - update availability for every
//                                           manually installed dependency
//   POST /api/dsh-plugin-updater/update   - run pnpm update for selected deps
//   POST /api/dsh-plugin-updater/restart  - restart the dsh web server
//
// Classification: a plugin is "builtin" when its module resolves inside the
// dsh application install; "third-party" otherwise (profile node_modules,
// pnpm store, git/link installs). Updates cover the profile's DIRECT
// third-party dependencies: npm-range deps check the npm registry, github:
// deps check the default branch head of their repository, and the installed
// git commit is read from the profile's pnpm-lock.yaml.

import { existsSync, readFileSync, realpathSync, appendFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { spawn, spawnSync } from "node:child_process";

const CATALOG_PATH = "/api/dsh-plugin-updater/catalog";
const UPDATES_PATH = "/api/dsh-plugin-updater/updates";
const UPDATE_PATH = "/api/dsh-plugin-updater/update";
const RESTART_PATH = "/api/dsh-plugin-updater/restart";

const UPDATE_CACHE_MS = 5 * 60 * 1000;
const UPDATE_TIMEOUT_MS = 5 * 60 * 1000;
const SELF_NAME = "dsh-plugin-updater";

/** Required services: route registration + the Cordis Loader tree. */
const inject = ["webServer", "loader"];

// Cordis FiberState -> public phase string (mirror of
// @deepseek-ai/dsh-host-plugin-inventory): PENDING 0, LOADING 1, ACTIVE 2,
// FAILED 3, DISPOSED 4, UNLOADING 5.
const FIBER_PHASE = ["pending", "loading", "active", "failed", null, "unloading"];

const require = createRequire(import.meta.url);

let needsRestart = false;
let updatesCache = null; // { at: number, payload: object }

// --- small utilities ---------------------------------------------------------

function tryRead(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function dshHome() {
  return process.env.DSH_HOME || join(homedir(), ".dsh");
}

/** The web profile directory: ctx.baseUrl anchors the composed tree file. */
function profileDirOf(ctx) {
  if (ctx.baseUrl) {
    try {
      const p = fileURLToPath(ctx.baseUrl);
      return /[.](?:yml|yaml|json)$/.test(p) ? dirname(p) : p;
    } catch {
      // fall through
    }
  }
  return join(dshHome(), "profiles", "web");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** One importer block (specifier + resolved version) from pnpm-lock.yaml. */
function lockfileBlock(lockText, name) {
  if (lockText === null) return null;
  const key = escapeRegExp(name);
  const re = new RegExp(
    "(?:^|\n)[ \t]{2,}(?:'" + key + "'|\"" + key + "\"|" + key + "):[ \t]*\n[ \t]{4,}specifier: ([^\n]*)\n[ \t]{4,}version: ([^\n]*)",
    "m"
  );
  const m = lockText.match(re);
  return m ? { specifier: m[1], version: m[2] } : null;
}

/** Numeric dotted-version comparison; positive when a > b. */
function compareVersions(a, b) {
  const pa = String(a).split(/[-+]/)[0].split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split(/[-+]/)[0].split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

// --- module resolution helpers ----------------------------------------------

/** Resolve a plugin specifier to its package directory (realpath'd). */
function realPackageDirOf(spec) {
  let resolved;
  try {
    resolved = require.resolve(spec);
  } catch {
    return null;
  }
  let real = resolved;
  try {
    real = realpathSync(resolved);
  } catch {
    // keep the unresolved path
  }
  let dir = dirname(real);
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return dirname(real);
}

let appRootCache;

/**
 * The dsh application install root: <install>/node_modules/@deepseek-ai/dsh.
 * Derived from any builtin bundle's real path (the profile tree junctions
 * builtin packages into the app directory, and realpathSync follows those
 * junctions to the canonical location).
 */
function dshAppRoot() {
  if (appRootCache !== undefined) return appRootCache;
  for (const probe of [
    "@deepseek-ai/cordis-plugin-loader",
    "@deepseek-ai/dsh-base",
    "@deepseek-ai/dsh-web-app"
  ]) {
    const dir = realPackageDirOf(probe);
    if (dir === null) continue;
    // <app>/node_modules/@deepseek-ai/<probe> -> <app>
    appRootCache = realpathSync(join(dir, "..", "..", ".."));
    return appRootCache;
  }
  appRootCache = null;
  return null;
}

/**
 * Classify one loader entry. Path-based first (exact); falls back to the
 * module-name prefix when the module cannot be resolved.
 */
function originOf(entry) {
  const name = entry.options && entry.options.name ? entry.options.name : "";
  const root = dshAppRoot();
  const pkgDir = realPackageDirOf(name);
  if (root !== null && pkgDir !== null) {
    const prefix = root.replace(/[\\/]+$/, "") + "\\";
    return pkgDir.toLowerCase().startsWith(prefix.toLowerCase()) ? "builtin" : "third-party";
  }
  return name.startsWith("@deepseek-ai/") ? "builtin" : "third-party";
}

function versionOf(pkgDir) {
  if (pkgDir === null) return null;
  try {
    const manifest = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
    return typeof manifest.version === "string" ? manifest.version : null;
  } catch {
    return null;
  }
}

function phaseOf(entry) {
  if (!entry.fiber || typeof entry.fiber.state !== "number") return null;
  const state = entry.fiber.state;
  return state >= 0 && state < FIBER_PHASE.length ? FIBER_PHASE[state] : null;
}

function buildCatalog(ctx) {
  const entries = [];
  for (const entry of ctx.loader.entries()) {
    if (entry.options && entry.options.group) continue;
    const moduleName = entry.options && entry.options.name ? entry.options.name : "";
    const pkgDir = realPackageDirOf(moduleName);
    entries.push({
      entryId: entry.id,
      moduleName,
      enabled: !entry.disabled,
      fiberPhase: phaseOf(entry),
      origin: originOf(entry),
      version: versionOf(pkgDir),
      packageDir: pkgDir
    });
  }
  const counts = { builtin: 0, "third-party": 0 };
  for (const entry of entries) counts[entry.origin] += 1;
  return { ok: true, appRoot: dshAppRoot(), counts, entries };
}

// --- update targets -----------------------------------------------------------

/** The profile's direct third-party dependencies as update targets. */
function updateTargets(profileDir) {
  const manifestPath = join(profileDir, "package.json");
  const manifestText = tryRead(manifestPath);
  if (manifestText === null) return { error: "profile package.json not found: " + manifestPath, targets: [] };
  let manifest;
  try {
    manifest = JSON.parse(manifestText);
  } catch (error) {
    return { error: "profile package.json unreadable: " + (error && error.message), targets: [] };
  }
  const deps = manifest.dependencies || {};
  const lockText = tryRead(join(profileDir, "pnpm-lock.yaml"));
  const targets = [];
  for (const [name, spec] of Object.entries(deps)) {
    if (typeof spec !== "string") continue;
    if (name === SELF_NAME) continue;
    if (name.startsWith("@deepseek-ai/")) continue;
    if (spec.startsWith("link:") || spec.startsWith("file:")) continue;
    if (spec.startsWith("github:")) {
      const m = spec.match(/^github:([^/#]+)\/([^/#]+)/);
      if (m === null) continue;
      const owner = m[1];
      const repo = m[2];
      const block = lockfileBlock(lockText, name);
      const commitMatch = block === null ? null : block.version.match(/tar\.gz\/([0-9a-f]{40})/);
      targets.push({
        name,
        spec,
        kind: "github",
        owner,
        repo,
        repoUrl: "https://github.com/" + owner + "/" + repo,
        installed: commitMatch === null ? null : commitMatch[1],
        installedShort: commitMatch === null ? null : commitMatch[1].slice(0, 7)
      });
      continue;
    }
    const pkg = tryRead(join(profileDir, "node_modules", name, "package.json"));
    let installed = null;
    if (pkg !== null) {
      try {
        const parsed = JSON.parse(pkg);
        installed = typeof parsed.version === "string" ? parsed.version : null;
      } catch {
        installed = null;
      }
    }
    targets.push({
      name,
      spec,
      kind: "npm",
      repoUrl: "https://www.npmjs.com/package/" + name,
      installed,
      installedShort: installed
    });
  }
  return { error: null, targets };
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "user-agent": "dsh-plugin-updater", accept: "application/json" },
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
  return res.json();
}

async function checkTarget(target) {
  try {
    if (target.kind === "npm") {
      const encoded = target.name.startsWith("@") ? target.name.replace("/", "%2F") : target.name;
      const data = await fetchJson("https://registry.npmjs.org/" + encoded);
      const latest = data && data["dist-tags"] && typeof data["dist-tags"].latest === "string"
        ? data["dist-tags"].latest
        : null;
      if (latest === null) throw new Error("registry returned no dist-tags.latest");
      const hasUpdate = target.installed !== null && latest !== target.installed && compareVersions(latest, target.installed) > 0;
      return { ...target, latest, latestShort: latest, latestDetail: "", hasUpdate, error: null };
    }
    const repo = await fetchJson("https://api.github.com/repos/" + target.owner + "/" + target.repo);
    const branch = repo && typeof repo.default_branch === "string" ? repo.default_branch : "main";
    const commit = await fetchJson("https://api.github.com/repos/" + target.owner + "/" + target.repo + "/commits/" + branch);
    const sha = commit && typeof commit.sha === "string" ? commit.sha : null;
    if (sha === null) throw new Error("github returned no head commit");
    const date = commit.commit && (commit.commit.committer || commit.commit.author)
      ? (commit.commit.committer && commit.commit.committer.date) || (commit.commit.author && commit.commit.author.date)
      : null;
    const message = commit.commit && typeof commit.commit.message === "string"
      ? commit.commit.message.split("\n")[0]
      : "";
    const hasUpdate = target.installed !== null && sha.toLowerCase() !== target.installed.toLowerCase();
    return {
      ...target,
      latest: sha,
      latestShort: sha.slice(0, 7),
      latestDetail: [message, date === null ? "" : String(date).slice(0, 10)].filter(Boolean).join(" · "),
      hasUpdate,
      error: null
    };
  } catch (error) {
    return {
      ...target,
      latest: null,
      latestShort: null,
      latestDetail: "",
      hasUpdate: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function buildUpdates(profileDir) {
  const { targets } = updateTargets(profileDir);
  const checked = await Promise.all(targets.map((target) => checkTarget(target)));
  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    restartPending: needsRestart,
    targets: checked
  };
}

async function getUpdates(ctx) {
  const profileDir = profileDirOf(ctx);
  if (updatesCache !== null && Date.now() - updatesCache.at < UPDATE_CACHE_MS) {
    return { ...updatesCache.payload, restartPending: needsRestart };
  }
  const payload = await buildUpdates(profileDir);
  updatesCache = { at: Date.now(), payload };
  return payload;
}

// --- update + restart actions -------------------------------------------------

function runPnpm(profileDir, args) {
  let lastError = null;
  for (const bin of ["pnpm.cmd", "pnpm"]) {
    try {
      return spawnSync(bin, args, {
        cwd: profileDir,
        encoding: "utf8",
        timeout: UPDATE_TIMEOUT_MS,
        maxBuffer: 32 * 1024 * 1024,
        windowsHide: true
      });
    } catch (error) {
      lastError = error;
    }
  }
  return { error: lastError, status: null, stdout: "", stderr: "" };
}

function applyUpdates(profileDir, names) {
  const { targets } = updateTargets(profileDir);
  const wanted = targets.filter((target) => names.includes(target.name));
  if (wanted.length === 0) {
    return { ok: false, error: "no matching third-party dependencies for: " + names.join(", ") };
  }
  const gitNames = wanted.filter((t) => t.kind === "github").map((t) => t.name);
  const npmNames = wanted.filter((t) => t.kind === "npm").map((t) => t.name);
  const outputs = [];
  const steps = [];
  if (gitNames.length > 0) steps.push([["update", ...gitNames], "git deps"]);
  if (npmNames.length > 0) steps.push([["update", "--latest", ...npmNames], "npm deps"]);
  for (const [args, label] of steps) {
    const result = runPnpm(profileDir, args);
    if (result.error) {
      outputs.push(label + ": spawn failed: " + (result.error.message || String(result.error)));
      continue;
    }
    outputs.push(label + ": exit " + result.status + "\n" + (result.stdout || "").slice(-4000) + (result.stderr || "").slice(-4000));
    if (result.status !== 0) {
      return { ok: false, error: "pnpm " + args.join(" ") + " failed (exit " + result.status + ")", output: outputs.join("\n---\n") };
    }
  }
  needsRestart = true;
  updatesCache = null;
  return { ok: true, updated: wanted.map((t) => t.name), output: outputs.join("\n---\n") };
}

function scheduleRestart(res) {
  const logPath = join(dshHome(), "logs", "web-restart.log");
  try {
    appendFileSync(logPath, "\n=== restart requested " + new Date().toISOString() + " ===\n");
  } catch {
    // logging is best-effort
  }
  try {
    const child = spawn("cmd.exe", ["/d", "/c", "ping -n 6 127.0.0.1 >nul & dsh web >> \"" + logPath + "\" 2>&1"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.unref();
  } catch (error) {
    writeJson(res, 500, { ok: false, error: "cannot schedule restart: " + (error && error.message) });
    return false;
  }
  writeJson(res, 200, { ok: true, message: "restart scheduled; the server exits now" });
  setTimeout(() => process.exit(0), 1000);
  return true;
}

// --- loopback guard (same discipline as dsh-archive-panel) ------------------

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

function writeJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "referrer-policy": "no-referrer",
    "cache-control": "no-store"
  });
  res.end(payload);
}

const MAX_BODY_BYTES = 64 * 1024;

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

// --- handlers -----------------------------------------------------------------

function makeCatalogHandler(ctx) {
  return (req, res) => {
    if (req.method !== "GET") { writeJson(res, 405, { ok: false, error: "method not allowed" }); return; }
    if (!isLoopbackRequest(req)) { writeJson(res, 403, { ok: false, error: "forbidden: loopback-only" }); return; }
    try {
      writeJson(res, 200, buildCatalog(ctx));
    } catch (error) {
      writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  };
}

function makeUpdatesHandler(ctx) {
  return async (req, res) => {
    if (req.method !== "GET") { writeJson(res, 405, { ok: false, error: "method not allowed" }); return; }
    if (!isLoopbackRequest(req)) { writeJson(res, 403, { ok: false, error: "forbidden: loopback-only" }); return; }
    try {
      writeJson(res, 200, await getUpdates(ctx));
    } catch (error) {
      writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  };
}

function makeUpdateHandler(ctx) {
  return async (req, res) => {
    if (req.method !== "POST") { writeJson(res, 405, { ok: false, error: "method not allowed" }); return; }
    if (!isLoopbackRequest(req)) { writeJson(res, 403, { ok: false, error: "forbidden: loopback-only" }); return; }
    const body = await readJsonBody(req);
    const names = body && Array.isArray(body.names) ? body.names.filter((n) => typeof n === "string").slice(0, 50) : [];
    if (names.length === 0) { writeJson(res, 400, { ok: false, error: "names is required" }); return; }
    try {
      writeJson(res, 200, applyUpdates(profileDirOf(ctx), names));
    } catch (error) {
      writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  };
}

function makeRestartHandler() {
  return (req, res) => {
    if (req.method !== "POST") { writeJson(res, 405, { ok: false, error: "method not allowed" }); return; }
    if (!isLoopbackRequest(req)) { writeJson(res, 403, { ok: false, error: "forbidden: loopback-only" }); return; }
    scheduleRestart(res);
  };
}

// --- entry -------------------------------------------------------------------

export function apply(ctx) {
  ctx.effect(() => {
    const disposers = [
      ctx.webServer.register({ kind: "exact", path: CATALOG_PATH, handler: makeCatalogHandler(ctx) }),
      ctx.webServer.register({ kind: "exact", path: UPDATES_PATH, handler: makeUpdatesHandler(ctx) }),
      ctx.webServer.register({ kind: "exact", path: UPDATE_PATH, handler: makeUpdateHandler(ctx) }),
      ctx.webServer.register({ kind: "exact", path: RESTART_PATH, handler: makeRestartHandler() })
    ];
    return () => {
      for (const dispose of disposers) dispose();
    };
  }, "dsh-plugin-updater: routes");
}

export { inject };

// Test seams (read-only helpers exercised by the dev harness).
export const _test = { profileDirOf, updateTargets, lockfileBlock, compareVersions, checkTarget };
