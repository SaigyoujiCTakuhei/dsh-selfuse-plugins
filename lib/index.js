/**
 * dsh-plugin-everything-search
 *
 * Model-facing instant filename/folder search over Windows Everything (voidtools)
 * via the official Everything SDK (Everything64.dll / Everything32.dll, bundled).
 *
 * No HTTP server and no es.exe are required: the SDK talks to the running
 * Everything process directly through IPC.
 *
 * Tools registered:
 *   - everything_search
 *   - everything_status
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";

const require = createRequire(import.meta.url);

export const name = "everything-search";
export const inject = ["tools", "systemPrompt"];

export const Config = z.object({
  enabled: z.boolean().default(true),
  maxResults: z.number().default(20),
  sort: z.number().default(1),
  announceToAgent: z.boolean().default(true)
});

// Everything SDK request flags: FILE_NAME | PATH | SIZE | DATE_MODIFIED
const REQUEST_FLAGS = 0x00000001 | 0x00000002 | 0x00000010 | 0x00000040;
const MAX_STR_CHARS = 4000;
const INVALID_UINT64 = 0xffffffffffffffffn;

// --- SDK loading (lazy: koffi is only required on first use) ----------------

let sdkCache = null;
let koffiRef = null;

function dllDir() {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dll");
}

function getSdk() {
  if (sdkCache) return sdkCache;
  if (process.platform !== "win32") throw new Error("everything_search requires Windows");
  const is64 = process.arch === "x64";
  const dllPath = path.join(dllDir(), is64 ? "Everything64.dll" : "Everything32.dll");

  const koffi = require("koffi");
  const everything = koffi.load(dllPath);
  koffiRef = koffi;

  const sdk = {
    dllPath,
    arch: is64 ? "x64" : "x86",
    SetSearchW: everything.func("Everything_SetSearchW", "void", ["str16"]),
    SetMax: everything.func("Everything_SetMax", "void", ["uint32"]),
    SetRequestFlags: everything.func("Everything_SetRequestFlags", "void", ["uint32"]),
    SetMatchCase: everything.func("Everything_SetMatchCase", "void", ["int"]),
    SetMatchWholeWord: everything.func("Everything_SetMatchWholeWord", "void", ["int"]),
    SetMatchPath: everything.func("Everything_SetMatchPath", "void", ["int"]),
    SetRegex: everything.func("Everything_SetRegex", "void", ["int"]),
    SetSort: everything.func("Everything_SetSort", "void", ["uint32"]),
    QueryW: everything.func("Everything_QueryW", "int", ["int"]),
    GetNumResults: everything.func("Everything_GetNumResults", "uint32", []),
    GetTotResults: everything.func("Everything_GetTotResults", "uint32", []),
    IsFileResult: everything.func("Everything_IsFileResult", "int", ["uint32"]),
    IsFolderResult: everything.func("Everything_IsFolderResult", "int", ["uint32"]),
    GetResultFileNameW: everything.func("Everything_GetResultFileNameW", koffi.pointer("void"), ["uint32"]),
    GetResultPathW: everything.func("Everything_GetResultPathW", koffi.pointer("void"), ["uint32"]),
    GetResultSize: everything.func("Everything_GetResultSize", "void", ["uint32", koffi.out(koffi.pointer("uint64"))]),
    GetResultDateModified: everything.func("Everything_GetResultDateModified", "void", ["uint32", koffi.out(koffi.pointer("uint64"))]),
    GetMajorVersion: everything.func("Everything_GetMajorVersion", "uint32", []),
    GetMinorVersion: everything.func("Everything_GetMinorVersion", "uint32", []),
    GetRevision: everything.func("Everything_GetRevision", "uint32", []),
    GetBuildNumber: everything.func("Everything_GetBuildNumber", "uint32", []),
    IsDBLoaded: everything.func("Everything_IsDBLoaded", "int", [])
  };
  sdkCache = sdk;
  return sdk;
}

// --- helpers ---------------------------------------------------------------

function asInt(value) {
  if (typeof value === "number") return Math.trunc(value);
  if (typeof value === "string") {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function readStr16(ptr) {
  if (!ptr) return "";
  const base = typeof ptr === "bigint" ? ptr : BigInt(ptr);
  let out = "";
  for (let i = 0; i < MAX_STR_CHARS; i++) {
    const u = koffiRef.decode.uint16(base + BigInt(i * 2));
    if (u === 0) break;
    out += String.fromCharCode(u);
  }
  return out;
}

function toSize(raw) {
  const n = typeof raw === "bigint" ? raw : BigInt(raw == null ? 0 : raw);
  if (n === INVALID_UINT64) return 0;
  const v = Number(n);
  return Number.isSafeInteger(v) ? v : 0;
}

function filetimeToISO(raw) {
  const n = typeof raw === "bigint" ? raw : BigInt(raw == null ? 0 : raw);
  if (n <= 0n || n === INVALID_UINT64) return "";
  const ms = Number(n) / 10000 - 11644473600000;
  if (ms <= 0) return "";
  return new Date(ms).toISOString();
}

function joinPath(dir, name) {
  if (!dir) return name;
  if (dir.endsWith("\\") || dir.endsWith("/")) return dir + name;
  return dir + "\\" + name;
}

function fmtSize(bytes) {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return v.toFixed(i === 0 ? 0 : 1) + " " + units[i];
}

function runQuery(sdk, query, opts, max, sort) {
  sdk.SetSearchW(query);
  sdk.SetMax(max);
  sdk.SetRequestFlags(REQUEST_FLAGS);
  sdk.SetMatchCase(opts.match_case ? 1 : 0);
  sdk.SetMatchWholeWord(opts.match_whole_word ? 1 : 0);
  sdk.SetMatchPath(opts.match_path ? 1 : 0);
  sdk.SetRegex(opts.regex ? 1 : 0);
  sdk.SetSort(sort);
  if (!sdk.QueryW(1)) throw new Error("Everything_QueryW returned false (is Everything running?)");

  const num = sdk.GetNumResults();
  const rows = [];
  for (let i = 0; i < num; i++) {
    const name = readStr16(sdk.GetResultFileNameW(i));
    const dir = readStr16(sdk.GetResultPathW(i));
    const isFile = !!sdk.IsFileResult(i);
    const isFolder = !!sdk.IsFolderResult(i);
    const sizeBuf = [null];
    sdk.GetResultSize(i, sizeBuf);
    const dtBuf = [null];
    sdk.GetResultDateModified(i, dtBuf);
    rows.push({
      type: isFolder ? "folder" : isFile ? "file" : "",
      name: name,
      path: dir,
      full_path: joinPath(dir, name),
      size: toSize(sizeBuf[0]),
      date_modified: filetimeToISO(dtBuf[0])
    });
  }
  return {
    rows,
    total: sdk.GetTotResults()
  };
}

function formatResults(value) {
  const lines = [];
  lines.push("Everything search (sdk): " + value.total + " total, showing " + value.results.length);
  value.results.forEach((row, i) => {
    const meta = [];
    if (row.size) meta.push(fmtSize(row.size));
    if (row.date_modified) meta.push(row.date_modified);
    lines.push(i + 1 + ". " + row.full_path + (meta.length ? "  [" + meta.join(" · ") + "]" : ""));
  });
  if (!value.results.length) lines.push("(no results)");
  return lines.join("\n");
}

// --- tools -----------------------------------------------------------------

function searchTool(config) {
  return defineTool({
    name: "everything_search",
    description:
      "Instant indexed filename/folder search across all Everything-indexed drives (Windows, voidtools Everything). Returns full paths, size and modified time. Use it when you know part of a filename and want a fast disk-wide lookup; call everything_status to check the backend.",
    parameters: {
      query: {
        type: "string",
        required: true,
        description: "Search query (Everything search syntax, e.g. '*.txt', 'foo bar', 'regex:...')."
      },
      match_case: { type: "boolean", default: false },
      match_whole_word: { type: "boolean", default: false },
      match_path: { type: "boolean", default: false },
      regex: { type: "boolean", default: false },
      max_results: { type: "integer", default: 20 }
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
                full_path: { type: "string", required: true },
                size: { type: "integer", required: true },
                date_modified: { type: "string", required: true }
              }
            }
          },
          total: { type: "integer", required: true },
          backend: { type: "string", required: true }
        }
      },
      render: (_args, value) => [{ type: "text", text: formatResults(value) }]
    },
    isConcurrencySafe: () => false,
    async execute(args) {
      const query = String(args.query ?? "").trim();
      if (!query) throw new Error("query must be a non-empty string");
      const max = Math.min(Math.max(1, asInt(args.max_results) || config.maxResults), 1000);
      const r = runQuery(getSdk(), query, args, max, config.sort ?? 1);
      return {
        results: r.rows.slice(0, max),
        total: r.total,
        backend: "sdk"
      };
    }
  });
}

function statusTool() {
  return defineTool({
    name: "everything_status",
    description: "Probe the Everything SDK backend: report SDK version, DLL path and whether the Everything database is loaded.",
    parameters: {},
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean", required: true },
          platform: { type: "string", required: true },
          arch: { type: "string", required: true },
          dll_path: { type: "string", required: true },
          sdk_version: { type: "string", required: true },
          db_loaded: { type: "boolean", required: true },
          error: { type: "string", required: true }
        }
      },
      render: (_args, value) => [
        {
          type: "text",
          text: value.ok
            ? "Everything SDK loaded (" + value.sdk_version + ", " + value.arch + ", db_loaded=" + value.db_loaded + ")"
            : "Everything SDK unavailable: " + value.error
        }
      ]
    },
    async execute() {
      try {
        const sdk = getSdk();
        const version = sdk.GetMajorVersion() + "." + sdk.GetMinorVersion() + "." + sdk.GetRevision() + "." + sdk.GetBuildNumber();
        return {
          ok: true,
          platform: process.platform,
          arch: sdk.arch,
          dll_path: sdk.dllPath,
          sdk_version: version,
          db_loaded: !!sdk.IsDBLoaded(),
          error: ""
        };
      } catch (err) {
        return {
          ok: false,
          platform: process.platform,
          arch: process.arch,
          dll_path: "",
          sdk_version: "",
          db_loaded: false,
          error: err && err.message ? err.message : String(err)
        };
      }
    }
  });
}

// --- entry -----------------------------------------------------------------

export function apply(ctx, config) {
  if (!config || config.enabled === false) return;

  if (config.announceToAgent !== false) {
    ctx.systemPrompt.section({
      name: "tool:everything",
      order: 104,
      text:
        "Use the everything_search tool to find files or folders instantly by name across all Everything-indexed drives (Windows voidtools Everything). Prefer it over recursive directory search when you know part of a filename and need a fast, disk-wide lookup. If a search fails, call everything_status to check the backend."
    });
  }

  ctx.tools.register(searchTool(config));
  ctx.tools.register(statusTool());
}
