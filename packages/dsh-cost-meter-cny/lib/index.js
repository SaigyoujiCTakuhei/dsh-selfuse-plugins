/**
 * dsh-cost-meter-cny — host half.
 *
 * Registers a `sessionCostCny` projection unit on the session-projection seam.
 * Unlike upstream `@steven-wu/dsh-cost-meter` (one flat USD table and a
 * hard-coded `$` badge), this unit prices every provider-usage sample by the
 * tier that was active at the event's OWN timestamp (`event.time`, Unix ms)
 * under Beijing time:
 *
 *   peak    09:00–12:00 and 14:00–18:00 (Asia/Shanghai)
 *   offpeak everything else
 *
 * Peak is exactly 2× off-peak in DeepSeek's 2026-08-17 tariff. Currency is CNY
 * and the browser half renders `¥`. The fold reuses token-meter's disjoint
 * usage buckets and its "replace the same (turn, step) sample instead of
 * double-counting" rule.
 *
 * Pricing is read once at boot from a JSON file. Defaults ship for the DeepSeek
 * official models; edit the file and restart `dsh web` to apply changes.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { z } from "zod";

const name = "dsh-cost-meter-cny";
const inject = ["sessionProjections"];

const PER = 1_000_000;

const DEFAULT_PRICING = {
  version: 3,
  currency: "CNY",
  per: PER,
  timezone: "Asia/Shanghai",
  peakHours: [
    [9, 12],
    [14, 18],
  ],
  // Peak applies only on these weekdays (DeepSeek official policy: Mon–Fri;
  // every other day is off-peak). 0=Sun … 6=Sat. Omit / empty / null = every day.
  peakDays: [1, 2, 3, 4, 5],
  default: {
    offpeak: { input: 4.5, output: 13.5, cacheRead: 0.15, cacheWrite: 0 },
    peak: { input: 9.0, output: 27.0, cacheRead: 0.3, cacheWrite: 0 },
  },
  models: {
    "deepseek-official/deepseek-v4-pro": {
      offpeak: { input: 4.5, output: 13.5, cacheRead: 0.15, cacheWrite: 0 },
      peak: { input: 9.0, output: 27.0, cacheRead: 0.3, cacheWrite: 0 },
    },
    "deepseek-official/deepseek-v4-flash": {
      offpeak: { input: 1.5, output: 4.5, cacheRead: 0.05, cacheWrite: 0 },
      peak: { input: 3.0, output: 9.0, cacheRead: 0.1, cacheWrite: 0 },
    },
    "deepseek-official/deepseek-v4-flash-vision-exp": {
      offpeak: { input: 1.5, output: 4.5, cacheRead: 0.05, cacheWrite: 0 },
      peak: { input: 3.0, output: 9.0, cacheRead: 0.1, cacheWrite: 0 },
    },
  },
  // GLM Coding Plan (bigmodel.cn) billing: subscription credit quota, not CNY.
  // credits = (input×in + cacheRead×cr + output×out) / divisor, off-peak ×0.5.
  // Peak = Mon–Fri 14:00–18:00 (Asia/Shanghai). Cache-write has no coefficient.
  zhipu: {
    divisor: 10000,
    offpeakFactor: 0.5,
    peakHours: [[14, 18]],
    peakDays: [1, 2, 3, 4, 5],
    groups: {
      "glm-5.3": { input: 6.9, cacheRead: 1.7, output: 24 },
      "glm-5.3-flash": { input: 2.3, cacheRead: 0.56, output: 8 },
    },
  },
};

function defaultPricingPath() {
  return process.env.DSH_COST_PRICING || join(homedir(), ".dsh", "cost-pricing.json");
}

const zeroPrice = () => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });

/**
 * Coerce one model/default entry into `{ offpeak, peak }`. A legacy flat entry
 * (the old single-tier shape) is accepted and used for BOTH tiers so an
 * existing v1 pricing file keeps working after an upgrade.
 */
function coerceTier(entry) {
  if (entry && typeof entry === "object" && ("offpeak" in entry || "peak" in entry)) {
    const offpeak = { ...zeroPrice(), ...(entry.offpeak ?? entry.peak ?? {}) };
    const peak = { ...zeroPrice(), ...(entry.peak ?? entry.offpeak ?? {}) };
    return { offpeak, peak };
  }
  const flat = { ...zeroPrice(), ...(entry ?? {}) };
  return { offpeak: { ...flat }, peak: { ...flat } };
}

/** Coerce the zhipu (GLM Coding Plan) section with built-in defaults for anything absent. */
function normalizeZhipu(doc) {
  const d = doc && typeof doc === "object" ? doc : {};
  const peakHours = Array.isArray(d.peakHours) && d.peakHours.length > 0
    ? d.peakHours.filter((r) => Array.isArray(r) && r.length === 2).map((r) => [Number(r[0]), Number(r[1])])
    : DEFAULT_PRICING.zhipu.peakHours;
  const rawPeakDays = Array.isArray(d.peakDays)
    ? d.peakDays.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    : null;
  const groups = {};
  const raw = d.groups && typeof d.groups === "object" ? d.groups : DEFAULT_PRICING.zhipu.groups;
  for (const [key, g] of Object.entries(raw)) {
    groups[key] = { input: Number(g.input) || 0, cacheRead: Number(g.cacheRead) || 0, output: Number(g.output) || 0 };
  }
  return {
    divisor: typeof d.divisor === "number" && d.divisor > 0 ? d.divisor : DEFAULT_PRICING.zhipu.divisor,
    offpeakFactor: typeof d.offpeakFactor === "number" && d.offpeakFactor > 0 && d.offpeakFactor <= 1
      ? d.offpeakFactor
      : DEFAULT_PRICING.zhipu.offpeakFactor,
    peakHours,
    peakDays: rawPeakDays && rawPeakDays.length > 0 ? rawPeakDays : null,
    groups,
  };
}

/** Coerce a parsed pricing document into the runtime shape with numeric per-key defaults. */
function normalizePricing(doc) {
  const per = typeof doc?.per === "number" && doc.per > 0 ? doc.per : PER;
  const currency = typeof doc?.currency === "string" && doc.currency ? doc.currency : "CNY";
  const timezone = typeof doc?.timezone === "string" && doc.timezone ? doc.timezone : "Asia/Shanghai";
  const peakHours = Array.isArray(doc?.peakHours) && doc.peakHours.length > 0
    ? doc.peakHours
        .filter((r) => Array.isArray(r) && r.length === 2)
        .map((r) => [Number(r[0]), Number(r[1])])
    : DEFAULT_PRICING.peakHours;
  const rawPeakDays = Array.isArray(doc?.peakDays)
    ? doc.peakDays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    : null;
  const peakDays = rawPeakDays && rawPeakDays.length > 0 ? rawPeakDays : null;
  const defaultTier = coerceTier(doc?.default ?? DEFAULT_PRICING.default);
  const models = {};
  const raw = doc?.models;
  if (raw && typeof raw === "object") {
    for (const [key, entry] of Object.entries(raw)) models[key] = coerceTier(entry);
  }
  return { per, currency, timezone, peakHours, peakDays, default: defaultTier, models, zhipu: normalizeZhipu(doc?.zhipu) };
}

function loadPricing(path) {
  if (existsSync(path)) {
    try {
      return normalizePricing(JSON.parse(readFileSync(path, "utf8")));
    } catch (error) {
      console.error(`[dsh-cost-meter-cny] failed to read ${path}: ${error?.message ?? error}`);
    }
  }
  // First run: write the editable defaults so the user can tune prices.
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(DEFAULT_PRICING, null, 2) + "\n", "utf8");
    console.error(`[dsh-cost-meter-cny] wrote default pricing table to ${path}`);
  } catch {
    /* read-only home is non-fatal: fall back to built-in defaults */
  }
  return normalizePricing(DEFAULT_PRICING);
}

/** Hour (0-23) of a Unix-ms instant in the pricing timezone; falls back to UTC+8. */
function hourInTz(timeMs, timezone) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(timeMs));
    const hourPart = parts.find((p) => p.type === "hour");
    if (hourPart) {
      const n = Number(hourPart.value);
      if (Number.isFinite(n)) return n;
    }
  } catch {
    /* invalid timezone -> fall through */
  }
  return new Date(timeMs + 8 * 3600 * 1000).getUTCHours();
}

/** Day of week (0=Sun … 6=Sat) of a Unix-ms instant in the pricing timezone; falls back to UTC. */
function dayInTz(timeMs, timezone) {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).formatToParts(new Date(timeMs));
    const wd = parts.find((p) => p.type === "weekday");
    if (wd) {
      const idx = names.indexOf(wd.value);
      if (idx >= 0) return idx;
    }
  } catch {
    /* invalid timezone -> fall through */
  }
  return new Date(timeMs).getUTCDay();
}

/** Resolve the active tier ("peak" | "offpeak") for a Unix-ms instant. */
function tierAt(timeMs, pricing) {
  // Outside the configured peak days (e.g. weekends when peakDays lists
  // weekdays only) the tier is always off-peak, regardless of the hour window.
  if (Array.isArray(pricing.peakDays) && pricing.peakDays.length > 0) {
    if (pricing.peakDays.indexOf(dayInTz(timeMs, pricing.timezone)) === -1) return "offpeak";
  }
  const hour = hourInTz(timeMs, pricing.timezone);
  for (const [start, end] of pricing.peakHours) {
    if (hour >= start && hour < end) return "peak";
  }
  return "offpeak";
}

/**
 * Whether the active provider/model is a DeepSeek-series model. The meter
 * prices under DeepSeek's official tariff only, so usage from anything else is
 * out of scope. Matching the combined `provider/model` string keeps this
 * robust: the current environment is `deepseek-official/deepseek-v4-pro`
 * /`-flash`, and third-party providers serving DeepSeek models
 * (`<other>/deepseek-...`) still match.
 */
function isDeepSeekSeries(provider, model) {
  return `${provider ?? ""}/${model ?? ""}`.toLowerCase().includes("deepseek");
}

/**
 * Which tariff family the active provider/model belongs to: "deepseek" (CNY
 * per-M-token, peak/off-peak), "zhipu" (GLM Coding Plan credit quota), or null
 * (unknown — not billable under either tariff, badges hide). Order matters:
 * deepseek is checked first so a DeepSeek provider id containing a stray
 * substring can never fall into the zhipu bucket.
 */
function classifyFamily(provider, model) {
  const hay = `${provider ?? ""}/${model ?? ""}`.toLowerCase();
  if (hay.includes("deepseek")) return "deepseek";
  if (hay.includes("glm") || hay.includes("zhipu") || hay.includes("bigmodel")) return "zhipu";
  return null;
}

/**
 * Pick the GLM Coding Plan coefficient group for a model id. The plan has two
 * groups and maps older models onto them: GLM-5.2/5.1 → glm-5.3 coefficients,
 * GLM-5-Turbo/4.7 → glm-5.3-flash coefficients. Anything Flash/Turbo-flavoured
 * rides the cheap group; unknown GLM ids conservatively ride glm-5.3.
 */
function zhipuGroupOf(model, zhipu) {
  const m = `${model ?? ""}`.toLowerCase();
  if (m.includes("flash") || m.includes("turbo") || m.includes("4.7")) {
    return zhipu.groups["glm-5.3-flash"] ?? zhipu.groups["glm-5.3"];
  }
  return zhipu.groups["glm-5.3"];
}

const costBucketsSchema = z.object({
  total: z.number(),
  input: z.number(),
  output: z.number(),
  cacheRead: z.number(),
  cacheWrite: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadTokens: z.number(),
  cacheWriteTokens: z.number(),
});

const tierSchema = z.enum(["peak", "offpeak"]).nullable();

// Internal fold state. Required by the projection engine's checkpoint paths:
// restore()/viewCheckpoint() run stateSchema.parse over persisted rows, and a
// unit without one silently drops out of the cached-read rung (and throws on
// the restore rung, forcing the full-refold fallback on every cold open).
const bucketsSchema = z.object({
  input: z.number(),
  output: z.number(),
  cacheRead: z.number(),
  cacheWrite: z.number(),
}).strict();
const turnSampleSchema = z.object({
  step: z.number(),
  buckets: bucketsSchema,
  cny: bucketsSchema,
  tier: tierSchema,
});
const familyEnum = z.enum(["deepseek", "zhipu"]);
const familyStateSchema = z.object({
  totals: bucketsSchema,
  cny: bucketsSchema,
  last: turnSampleSchema.extend({ turn: z.number() }).nullable(),
  byTurn: z.record(
    z.string(),
    z.object({
      buckets: bucketsSchema,
      cny: bucketsSchema,
      tier: tierSchema,
      last: turnSampleSchema.nullable(),
    }).strict(),
  ),
  tier: tierSchema,
  priced: z.boolean(),
}).strict();
const stateSchema = z
  .object({
    provider: z.string().nullable(),
    model: z.string().nullable(),
    families: z.object({ deepseek: familyStateSchema, zhipu: familyStateSchema }).strict(),
    priced: z.boolean(),
  })
  .strict();

const sessionCostSchema = costBucketsSchema
  .extend({
    family: familyEnum.nullable(),
    currency: z.string(),
    provider: z.string().nullable(),
    model: z.string().nullable(),
    tier: tierSchema,
    priced: z.boolean(),
    currencyByFamily: z.record(z.string(), z.string()),
    totalByFamily: z.record(z.string(), z.number()),
    peakHoursByFamily: z.record(z.string(), z.array(z.tuple([z.number(), z.number()]))),
    peakDaysByFamily: z.record(z.string(), z.array(z.number()).nullable()),
    byFamily: z.record(familyEnum, costBucketsSchema.extend({ tier: tierSchema })),
    timezone: z.string(),
    peakHours: z.array(z.tuple([z.number(), z.number()])),
    peakDays: z.array(z.number()).nullable(),
    byTurn: z.record(z.string(), costBucketsSchema.extend({ tier: tierSchema, family: familyEnum })),
  })
  .strict();

function makeProjection(pricing) {
  const { per, default: defaultTier, models, zhipu: z } = pricing;
  const FAMILY_NAMES = ["deepseek", "zhipu"];
  const CURRENCY_BY_FAMILY = { deepseek: "CNY", zhipu: "积分" };

  function priceOf(provider, model, tier) {
    const key = provider && model ? `${provider}/${model}` : null;
    const tiers = key && Object.prototype.hasOwnProperty.call(models, key) ? models[key] : defaultTier;
    return tiers[tier] ?? tiers.offpeak ?? zeroPrice();
  }

  const zeroBuckets = () => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
  const zeroCny = () => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
  const zeroFamilyState = () => ({ totals: zeroBuckets(), cny: zeroCny(), last: null, byTurn: {}, tier: null, priced: false });

  const cnyFor = (buckets, price) => ({
    input: (buckets.input * price.input) / per,
    output: (buckets.output * price.output) / per,
    cacheRead: (buckets.cacheRead * price.cacheRead) / per,
    cacheWrite: (buckets.cacheWrite * price.cacheWrite) / per,
  });

  // GLM Coding Plan credits for one usage sample. Credits = Σ(tokens ×
  // coefficient) / divisor, multiplied by 0.5 outside peak windows. Cache
  // writes carry no coefficient in the plan.
  function zhipuCreditsFor(buckets, tier, model) {
    const g = zhipuGroupOf(model, z);
    const factor = tier === "peak" ? 1 : z.offpeakFactor;
    return {
      input: (buckets.input * g.input) / z.divisor * factor,
      output: (buckets.output * g.output) / z.divisor * factor,
      cacheRead: (buckets.cacheRead * g.cacheRead) / z.divisor * factor,
      cacheWrite: 0,
    };
  }

  const addReplacing = (totals, previous, next) => ({
    input: totals.input - (previous?.input ?? 0) + next.input,
    output: totals.output - (previous?.output ?? 0) + next.output,
    cacheRead: totals.cacheRead - (previous?.cacheRead ?? 0) + next.cacheRead,
    cacheWrite: totals.cacheWrite - (previous?.cacheWrite ?? 0) + next.cacheWrite,
  });

  const bucketsView = (buckets, cny) => ({
    total: cny.input + cny.output + cny.cacheRead + cny.cacheWrite,
    input: cny.input,
    output: cny.output,
    cacheRead: cny.cacheRead,
    cacheWrite: cny.cacheWrite,
    inputTokens: buckets.input,
    outputTokens: buckets.output,
    cacheReadTokens: buckets.cacheRead,
    cacheWriteTokens: buckets.cacheWrite,
  });

  const windowsOf = (family) =>
    family === "zhipu"
      ? { peakHours: z.peakHours, peakDays: z.peakDays }
      : { peakHours: pricing.peakHours, peakDays: pricing.peakDays };

  return {
    key: "sessionCostCny",
    stateSchema,
    init: () => ({
      provider: null,
      model: null,
      families: { deepseek: zeroFamilyState(), zhipu: zeroFamilyState() },
      priced: false,
    }),
    apply: (state, event) => {
      if (event.type === "request/header") {
        const cfg = event.data?.header?.config ?? {};
        const provider = cfg.provider ?? state.provider;
        const model = cfg.model ?? state.model;
        if (provider === state.provider && model === state.model) return state;
        return { ...state, provider, model };
      }

      let turn;
      let step;
      let usage;
      if (event.type === "assistant/chunk" && event.data?.chunk?.type === "usage") {
        ({ turn, step } = event.data);
        usage = event.data.chunk.usage;
      } else if (event.type === "assistant/message" && event.data?.usage !== void 0) {
        ({ turn, step, usage } = event.data);
      } else {
        return state;
      }

      // Only usage from a recognised tariff family is billable; anything else
      // (unknown providers/models) is left out of every ledger. Each family
      // keeps its own ledger — CNY and credits must never mix into one total —
      // so switching models mid-session switches ledgers without losing either.
      const family = classifyFamily(state.provider, state.model);
      if (!family) return state;
      const fs = state.families[family];

      const buckets = {
        input: usage.inputTokens ?? 0,
        output: usage.outputTokens ?? 0,
        cacheRead: usage.cacheReadTokens ?? 0,
        cacheWrite: usage.cacheWriteTokens ?? 0,
      };
      const windows = windowsOf(family);
      const tier = tierAt(event.time, { timezone: pricing.timezone, peakHours: windows.peakHours, peakDays: windows.peakDays });
      const contribution = family === "deepseek"
        ? cnyFor(buckets, priceOf(state.provider, state.model, tier))
        : zhipuCreditsFor(buckets, tier, state.model);

      // Whole-session fold (scoped to this family): replace the same
      // (turn, step) sample.
      const previous =
        fs.last !== null && fs.last.turn === turn && fs.last.step === step ? fs.last : void 0;
      const totals = addReplacing(fs.totals, previous?.buckets, buckets);
      const cny = addReplacing(fs.cny, previous?.cny, contribution);

      // Per-turn fold: replace the same step sample within its turn.
      const tKey = String(turn);
      const t = fs.byTurn[tKey] ?? { buckets: zeroBuckets(), cny: zeroCny(), last: null, tier: null };
      const tPrevious = t.last !== null && t.last.step === step ? t.last : void 0;
      const tBuckets = addReplacing(t.buckets, tPrevious?.buckets, buckets);
      const tCny = addReplacing(t.cny, tPrevious?.cny, contribution);

      const anyUsage = buckets.input + buckets.output + buckets.cacheRead + buckets.cacheWrite > 0;

      return {
        ...state,
        families: {
          ...state.families,
          [family]: {
            totals,
            cny,
            tier,
            last: { turn, step, buckets, cny: contribution, tier },
            byTurn: {
              ...fs.byTurn,
              [tKey]: { buckets: tBuckets, cny: tCny, tier, last: { step, buckets, cny: contribution, tier } },
            },
            priced: fs.priced || anyUsage,
          },
        },
        priced: state.priced || anyUsage,
      };
    },
    wire: {
      viewSchema: sessionCostSchema,
      view: (state) => {
        const family = classifyFamily(state.provider, state.model);
        const cur = family ? state.families[family] : zeroFamilyState();
        const windows = windowsOf(family);

        const byFamily = {};
        const totalByFamily = {};
        const peakHoursByFamily = {};
        const peakDaysByFamily = {};
        for (const f of FAMILY_NAMES) {
          const fs = state.families[f];
          byFamily[f] = { ...bucketsView(fs.totals, fs.cny), tier: fs.tier };
          totalByFamily[f] = fs.cny.input + fs.cny.output + fs.cny.cacheRead + fs.cny.cacheWrite;
          const w = windowsOf(f);
          peakHoursByFamily[f] = w.peakHours;
          peakDaysByFamily[f] = w.peakDays;
        }

        // Per-turn costs merged across families — one turn runs on one model,
        // so each entry is tagged with the family that priced it and the
        // client formats it in that family's currency.
        const byTurn = {};
        for (const f of FAMILY_NAMES) {
          for (const [turn, t] of Object.entries(state.families[f].byTurn)) {
            byTurn[turn] = { ...bucketsView(t.buckets, t.cny), tier: t.tier, family: f };
          }
        }

        return {
          ...bucketsView(cur.totals, cur.cny),
          family,
          currency: family ? CURRENCY_BY_FAMILY[family] : "",
          provider: state.provider,
          model: state.model,
          tier: cur.tier,
          priced: state.priced,
          currencyByFamily: CURRENCY_BY_FAMILY,
          totalByFamily,
          peakHoursByFamily,
          peakDaysByFamily,
          byFamily,
          timezone: pricing.timezone,
          peakHours: windows.peakHours,
          peakDays: windows.peakDays,
          byTurn,
        };
      },
    },
    // v3: per-family ledgers (deepseek CNY + zhipu credits). v2/v1 checkpoints
    // were folded with skip-non-DeepSeek semantics and a single accumulator —
    // they cannot be extended in place, so they are discarded and refolded.
    stateVersion: 3,
  };
}

/**
 * Register the `sessionCostCny` unit. The registration is an effect on this
 * plugin's fiber, so unloading the plugin removes the key.
 * @param ctx - registrant context carrying the projection registry.
 * @param config - optional row config; `pricingPath` overrides the pricing file.
 */
function apply(ctx, config) {
  const pricingPath = config?.pricingPath ?? defaultPricingPath();
  const pricing = loadPricing(pricingPath);
  ctx.sessionProjections.register(makeProjection(pricing));
}

export { apply, inject, name };
