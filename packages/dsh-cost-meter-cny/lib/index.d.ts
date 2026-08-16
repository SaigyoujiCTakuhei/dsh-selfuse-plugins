/**
 * dsh-cost-meter-cny — host half type surface.
 *
 * Augments the session-projection key table with the `sessionCostCny` unit the
 * plugin registers, and types the cordis plugin body exported by `lib/index.js`.
 */

declare module "@deepseek-ai/dsh-session-projection/types" {
  type CostTier = "peak" | "offpeak" | null;

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
    /** Whole-session CNY cost plus per-turn cost keyed by turn number. */
    sessionCostCny: CostBucketView & {
      provider: string | null;
      model: string | null;
      /** Tier of the most recently priced usage sample. */
      tier: CostTier;
      /** True once any priced usage has been folded. */
      priced: boolean;
      currency: string;
      timezone: string;
      /** Peak windows as [startHour, endHour) in the pricing timezone. */
      peakHours: [number, number][];
      /** Per-turn cost keyed by turn number as a string. */
      byTurn: Record<string, CostBucketView & { tier: CostTier }>;
    };
  }
}

/** Cordis plugin display name. */
export const name: string;
/** Cordis service-injection list the plugin requires. */
export const inject: string[];
/** Plugin body: reads the pricing table and registers the `sessionCostCny` unit. */
export function apply(ctx: unknown, config?: { pricingPath?: string }): void;
