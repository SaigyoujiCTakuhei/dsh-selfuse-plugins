/**
 * dsh-cost-meter-cny — host half type surface.
 *
 * Augments the session-projection key table with the `sessionCostCny` unit the
 * plugin registers, and types the cordis plugin body exported by `lib/index.js`.
 */

declare module "@deepseek-ai/dsh-session-projection/types" {
  type CostTier = "peak" | "offpeak" | null;
  /** Tariff family: DeepSeek CNY per-M-token, or GLM Coding Plan credits. */
  type CostFamily = "deepseek" | "zhipu" | null;

  interface CostBucketView {
    total: number;
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
  }

  interface SessionProjectionMap {
    /**
     * Whole-session cost plus per-turn cost keyed by turn number. Top-level
     * buckets mirror the fold's current family; `byFamily` carries one ledger
     * per family (deepseek denominated in CNY, zhipu in plan credits), and
     * `byTurn` entries are tagged with the family that priced them.
     */
    sessionCostCny: CostBucketView & {
      family: CostFamily;
      /** Currency label of the current family: "CNY" | "积分". */
      currency: string;
      provider: string | null;
      model: string | null;
      /** Tier of the most recently priced usage sample. */
      tier: CostTier;
      /** True once any priced usage has been folded (any family). */
      priced: boolean;
      currencyByFamily: Record<string, string>;
      totalByFamily: Record<string, number>;
      peakHoursByFamily: Record<string, [number, number][]>;
      peakDaysByFamily: Record<string, number[] | null>;
      byFamily: Record<"deepseek" | "zhipu", CostBucketView & { tier: CostTier }>;
      timezone: string;
      /** Peak windows of the current family as [startHour, endHour). */
      peakHours: [number, number][];
      /** Per-turn cost keyed by turn number as a string. */
      byTurn: Record<string, CostBucketView & { tier: CostTier; family: "deepseek" | "zhipu" }>;
    };
  }
}

/** Cordis plugin display name. */
export const name: string;
/** Cordis service-injection list the plugin requires. */
export const inject: string[];
/** Plugin body: reads the pricing table and registers the `sessionCostCny` unit. */
export function apply(ctx: unknown, config?: { pricingPath?: string }): void;
