/**
 * dsh-plugin-everything-search
 *
 * Model-facing instant filename/folder search over Windows Everything (voidtools).
 *
 * Backends:
 *   - "http": Everything's built-in HTTP server (Tools -> Options -> HTTP Server).
 *   - "es":   the es.exe command-line tool, spawned once per query.
 *
 * Tools registered:
 *   - everything_search: indexed filename/folder search.
 *   - everything_status: probe the configured backend.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";

const execFileAsync = promisify(execFile);

export const name = "everything-search";
export const inject = ["tools", "systemPrompt"];

export const Config = z.object({
  enabled: z.boolean().default(true),
  backend: z.string().default("http"),
  httpBaseUrl: z.string().default("http://127.0.0.1:47805"),
  esPath: z.string().default("es.exe"),
  timeoutMs: z.number().default(5000),
  maxResults: z.number().default(10),
  announceToAgent: z.boolean().default(true)
});

// --- helpers ---------------------------------------------------------------

function asInt(value) {
  if (typeof value === "number") return Math.trunc(value);
  if (typeof value === "string") {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function pick(obj, keys) {
  if (!obj || typeof obj !== "object") return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

function fmtDate(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value > 1e9 ? value * 1000 : value;
    if (ms > 0) {
      try {
        return new Date(ms).toISOString();
      } catch {
        /* ignore */
      }
    }
  }
  if (value === undefined || value === null) return "";
  return String(value);
}

function fmtSize(bytes) {
  const n = asInt(bytes);
  if (n <= 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return v.toFixed(i === 0 ? 0 : 1) + " " + units[i];
}

function buildQuery(query, opts) {
  const mods = [];
  if (opts.match_case) mods.push("case:");
  if (opts.match_whole_word) mods.push("wholeword:");
  if (opts.regex) mods.push("regex:");
  if (opts.match_path) mods.push("path:");
  return mods.length ? mods.join("") + query : query;
}

// --- backends --------------------------------------------------------------

function normalizeRow(row) {
  if (!row || typeof row !== "object") return null;
  const name = String(pick(row, ["name", "filename"]) ?? "");
  const path = String(pick(row, ["path", "full_path", "fullpath"]) ?? name);
  let type = pick(row, ["type", "kind"]);
  if (type !== "file" && type !== "folder") {
    const isFile = pick(row, ["is_file"]);
    const isFolder = pick(row, ["is_folder"]);
    if (isFile === true || isFile === 1) type = "file";
    else if (isFolder === true || isFolder === 1) type = "folder";
    else type = "";
  }
  return {
    type: String(type),
    name: name,
    path: path,
    size: asInt(pick(row, ["size"])),
    date_modified: fmtDate(pick(row, ["date_modified", "date_modified_unix", "dm"]))
  };
}

function normalizeHttpResults(parsed) {
  let raw = [];
  if (Array.isArray(parsed)) raw = parsed;
  else if (parsed && typeof parsed === "object" && Array.isArray(parsed.results)) raw = parsed.results;
  else if (parsed && typeof parsed === "object") {
    for (const value of Object.values(parsed)) {
      if (Array.isArray(value)) {
        raw = value;
        break;
      }
    }
  }
  return raw.map(normalizeRow).filter(Boolean);
}

async function queryHttp(baseUrl, query, maxResults, timeoutMs, signal) {
  const url = new URL(baseUrl);
  url.searchParams.set("search", query);
  url.searchParams.set("json", "1");
  url.searchParams.set("count", String(maxResults));
  const res = await fetch(url.toString(), {
    signal: signal ?? AbortSignal.timeout(timeoutMs),
    redirect: "error"
  });
  if (!res.ok) throw new Error("Everything HTTP server responded HTTP " + res.status);
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Everything HTTP server returned non-JSON output");
  }
  return normalizeHttpResults(parsed);
}

async function queryEs(esPath, query, maxResults, timeoutMs) {
  const { stdout } = await execFileAsync(esPath, [query, "-n", String(maxResults)], {
    windowsHide: true,
    timeout: timeoutMs,
    maxBuffer: 16 * 1024 * 1024
  });
  const lines = stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return lines.map((p) => ({
    type: "",
    name: p,
    path: p,
    size: 0,
    date_modified: ""
  }));
}

// --- tool definitions ------------------------------------------------------

function searchToolDefinition(config) {
  return defineTool({
    name: "everything_search",
    description:
      "Instant indexed filename/folder search across all Everything-indexed drives (Windows, voidtools Everything). Returns matching paths with size and modified time. Use it when you know part of a filename and want a fast disk-wide lookup; call everything_status to check availability.",
    parameters: {
      query: {
        type: "string",
        required: true,
        description: "Search query. Supports Everything search syntax and modifiers such as case:, wholeword:, regex: and path:."
      },
      match_case: { type: "boolean", default: false },
      match_whole_word: { type: "boolean", default: false },
      match_path: { type: "boolean", default: false },
      regex: { type: "boolean", default: false },
      max_results: { type: "integer", default: 10 }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          results: {
            type: "array",
            required: true,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                type: { type: "string" },
                name: { type: "string", required: true },
                path: { type: "string", required: true },
                size: { type: "integer", required: true },
                date_modified: { type: "string", required: true }
              }
            }
          },
          total: { type: "integer", required: true },
          backend: { type: "string", required: true }
        }
      },
      render: (_args, value) => [
        {
          type: "text",
          text: formatSearchText(value)
        }
      ]
    },
    timeoutMs: config.timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const query = String(args.query ?? "").trim();
      if (!query) throw new Error("query must be a non-empty string");
      const max = Math.min(Math.max(1, asInt(args.max_results) || config.maxResults), 1000);
      const q = buildQuery(query, {
        match_case: !!args.match_case,
        match_whole_word: !!args.match_whole_word,
        match_path: !!args.match_path,
        regex: !!args.regex
      });
      const signal = exec?.signal
        ? AbortSignal.any([exec.signal, AbortSignal.timeout(config.timeoutMs)])
        : AbortSignal.timeout(config.timeoutMs);
      const rows =
        config.backend === "es"
          ? await queryEs(config.esPath, q, max, config.timeoutMs)
          : await queryHttp(config.httpBaseUrl, q, max, config.timeoutMs, signal);
      return {
        results: rows.slice(0, max),
        total: rows.length,
        backend: config.backend
      };
    }
  });
}

function statusToolDefinition(config) {
  return defineTool({
    name: "everything_status",
    description: "Probe the configured Everything backend (HTTP server or es.exe) and report whether it is reachable.",
    parameters: {},
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean", required: true },
          backend: { type: "string", required: true },
          base_url: { type: "string" },
          http_status: { type: "integer" },
          error: { type: "string" }
        }
      },
      render: (_args, value) => [
        {
          type: "text",
          text: value.ok
            ? "Everything backend (" + value.backend + ") is reachable."
            : "Everything backend (" + value.backend + ") is NOT reachable: " + (value.error || "unknown error")
        }
      ]
    },
    async execute() {
      if (config.backend === "es") {
        try {
          await execFileAsync(config.esPath, ["-n", "0", ""], {
            windowsHide: true,
            timeout: config.timeoutMs,
            maxBuffer: 1024 * 1024
          });
          return { ok: true, backend: "es", base_url: "", http_status: 0, error: "" };
        } catch (err) {
          if (err && err.code === "ENOENT") {
            return { ok: false, backend: "es", base_url: "", http_status: 0, error: "es.exe not found: " + config.esPath };
          }
          return { ok: true, backend: "es", base_url: "", http_status: 0, error: "" };
        }
      }
      try {
        const url = new URL(config.httpBaseUrl);
        url.searchParams.set("search", "");
        url.searchParams.set("json", "1");
        url.searchParams.set("count", "0");
        const res = await fetch(url.toString(), {
          signal: AbortSignal.timeout(config.timeoutMs),
          redirect: "error"
        });
        return {
          ok: res.ok,
          backend: "http",
          base_url: config.httpBaseUrl,
          http_status: res.status,
          error: res.ok ? "" : "HTTP " + res.status
        };
      } catch (err) {
        return {
          ok: false,
          backend: "http",
          base_url: config.httpBaseUrl,
          http_status: 0,
          error: err && err.message ? err.message : String(err)
        };
      }
    }
  });
}

function formatSearchText(value) {
  const lines = [];
  lines.push("Everything search (" + value.backend + "): " + value.total + " result(s)");
  value.results.forEach((row, i) => {
    const meta = [];
    if (row.size) meta.push(fmtSize(row.size));
    if (row.date_modified) meta.push(row.date_modified);
    lines.push(i + 1 + ". " + row.path + (meta.length ? "  [" + meta.join(" · ") + "]" : ""));
  });
  if (!value.results.length) lines.push("(no results)");
  return lines.join("\n");
}

// --- plugin entry ----------------------------------------------------------

export function apply(ctx, config) {
  if (!config || config.enabled === false) return;
  const effective = {
    ...config,
    backend: config.backend === "es" ? "es" : "http"
  };

  if (effective.announceToAgent !== false) {
    ctx.systemPrompt.section({
      name: "tool:everything",
      order: 104,
      text:
        "Use the everything_search tool to find files or folders instantly by name across all Everything-indexed drives (Windows voidtools Everything). Prefer it over recursive directory search when you know part of a filename and need a fast, disk-wide lookup. If a search fails, call everything_status to check the backend."
    });
  }

  ctx.tools.register(searchToolDefinition(effective));
  ctx.tools.register(statusToolDefinition(effective));
}
