/**
 * dsh-context-compression-status — host half.
 *
 * Registers a `contextCompaction` session-projection unit. The unit folds the
 * durable session log and records how many successful compactions have run and
 * the details of the most recent one.
 *
 * dsh emits three correlated events per compaction transaction:
 *   compaction/start   — opens the durable lock
 *   compaction/summary — the successful replacement record (one per commit)
 *   compaction/end     — always closes the transaction (success or failure)
 *
 * Only `compaction/summary` is emitted on a *successful* compaction, so counting
 * it yields the number of real history compressions — exactly what a user means
 * by "压缩了几次". The companion context-pressure figure (limit + current usage)
 * is already served by the core `contextPressure` projection and is read
 * directly on the browser half, so this unit owns only the compaction count.
 *
 * The unit carries a `schema` because the session-projection registry runs
 * `schema.parse(view(state))` on every snapshot. We hand-roll it instead of
 * pulling in `zod` so the host half stays dependency-free and resolves cleanly
 * even when the package is symlinked into a profile (node would otherwise fail
 * to locate a hoisted `zod` from the symlink's real path).
 */
const name = "dsh-context-compression-status";
const inject = ["sessionProjections"];

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

/**
 * Register the `contextCompaction` unit on the session-projection seam. The
 * registration is an effect on this plugin's fiber, so unloading the plugin
 * removes the key.
 * @param ctx - registrant context carrying the projection registry.
 * @param config - optional row config (unused; accepted for the bundle contract).
 */
function apply(ctx, config) {
  ctx.sessionProjections.register(makeUnit());
}

export { apply, inject, name };
