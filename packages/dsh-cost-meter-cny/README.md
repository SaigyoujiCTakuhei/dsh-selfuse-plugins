# dsh-cost-meter-cny

Out-of-tree [dsh](https://github.com/deepseek-ai/deepseek-harness) plugin that
shows a live **CNY cost badge** (whole-session + per-turn) for the open
conversation in the Web UI, priced with Beijing **peak / off-peak tiers**.

It is a fork of [@steven-wu/dsh-cost-meter](https://github.com/Sttrevens/dsh-cost-meter)
with three changes:

1. **Peak/off-peak pricing** — every usage sample is priced by the tier that was
   active at that event's own timestamp (event.time, Unix ms), under Beijing
   time: peak = 09:00–12:00 and 14:00–18:00 (Asia/Shanghai), offpeak =
   everything else. Peak only applies on the weekdays listed in `peakDays`
   (0=Sun…6=Sat; the shipped default is `[1,2,3,4,5]` = Mon–Fri, matching
   DeepSeek's official policy — weekends are always off-peak). Omit `peakDays`
   (or set it to `[]` / `null`) to treat every day as peak-eligible. The fold
   stays a pure function of the event stream, so checkpoint restore / replay
   never drifts.
2. **CNY rendering** — the badge renders ¥ for DeepSeek (upstream hard-codes $).
3. **Tariff families (DeepSeek CNY + GLM Coding Plan credits)** — the fold
   classifies the active provider/model into a tariff family and keeps one
   ledger per family, so currencies never mix into one total:

   - `deepseek` — matched on the combined `provider/model` string containing
     `deepseek`. Priced in CNY per M tokens with the peak/off-peak table below.
   - `zhipu` — matched on `glm` / `zhipu` / `bigmodel`. Priced in **GLM Coding
     Plan subscription credits** (docs.bigmodel.cn): credits =
     Σ(input × in + cacheRead × cr + output × out) / 10000, ×0.5 outside peak
     (peak = Mon–Fri 14:00–18:00 Asia/Shanghai). Two coefficient groups:
     `glm-5.3` = 6.9 / 1.7 / 24 and `glm-5.3-flash` = 2.3 / 0.56 / 8;
     GLM-5.2/5.1 ride 5.3, GLM-5-Turbo/4.7 (and anything flash/turbo-flavoured)
     ride flash. Cache writes carry no coefficient. MCP-tool credit
     consumption is not visible in token usage events and stays out of scope.
     Configure via the optional `zhipu` block in the pricing file.
   - anything else — not billable under either tariff: skipped by the fold,
     badges hidden.

   The badges follow the composer's **live** model selection: switching the
   picker to a DeepSeek model shows the CNY ledger (¥0 if that family has no
   usage yet), switching to a GLM model shows the credit ledger
   (`0.00 积分` likewise), switching to an unknown model hides the badges at
   once. Per-family totals survive all switching — ledgers resume, never
   restart, and are summarised together in the tooltip (`本会话累计`). Per-turn
   badges are tagged with the family that priced them and render in that
   family's currency. The client reads the live selection from the shared
   per-session model directory (`@deepseek-ai/dsh-client-ui-model-selection`);
   if the service is unavailable it falls back to the fold's last
   request/header. Checkpoints persisted under older fold semantics
   (stateVersion ≤ 2: everything priced as DeepSeek, or DeepSeek-only
   single-ledger) are discarded and refolded, not extended in place.

## Pricing table

Pricing is **CNY per million tokens**, keyed by provider/model, with two tiers
per model:

    {
      "version": 2,
      "currency": "CNY",
      "per": 1000000,
      "timezone": "Asia/Shanghai",
      "peakHours": [[9, 12], [14, 18]],
      "peakDays": [1, 2, 3, 4, 5],
      "default": {
        "offpeak": { "input": 4.5,  "output": 13.5, "cacheRead": 0.15, "cacheWrite": 0 },
        "peak":    { "input": 9.0,  "output": 27.0, "cacheRead": 0.30, "cacheWrite": 0 }
      },
      "models": {
        "deepseek-official/deepseek-v4-pro": {
          "offpeak": { "input": 4.5,  "output": 13.5, "cacheRead": 0.15, "cacheWrite": 0 },
          "peak":    { "input": 9.0,  "output": 27.0, "cacheRead": 0.30, "cacheWrite": 0 }
        },
        "deepseek-official/deepseek-v4-flash": {
          "offpeak": { "input": 1.5,  "output": 4.5,  "cacheRead": 0.05, "cacheWrite": 0 },
          "peak":    { "input": 3.0,  "output": 9.0,  "cacheRead": 0.10, "cacheWrite": 0 }
        },
        "deepseek-official/deepseek-v4-flash-vision-exp": {
          "offpeak": { "input": 1.5,  "output": 4.5,  "cacheRead": 0.05, "cacheWrite": 0 },
          "peak":    { "input": 3.0,  "output": 9.0,  "cacheRead": 0.10, "cacheWrite": 0 }
        }
      }
    }

input = uncached input, output = output, cacheRead = cache hit, cacheWrite =
cache write (DeepSeek does not publish a separate cache-write price, so it
stays 0). A legacy **flat** entry (no offpeak/peak keys) is accepted and used
for both tiers.

### GLM Coding Plan (zhipu)

The optional `zhipu` block configures the credit tariff (defaults shown; all
keys may be omitted):

    {
      "zhipu": {
        "divisor": 10000,
        "offpeakFactor": 0.5,
        "peakHours": [[14, 18]],
        "peakDays": [1, 2, 3, 4, 5],
        "groups": {
          "glm-5.3":       { "input": 6.9, "cacheRead": 1.7,  "output": 24 },
          "glm-5.3-flash": { "input": 2.3, "cacheRead": 0.56, "output": 8 }
        }
      }
    }

`groups` entries are credit coefficients applied per `divisor` tokens
(default 10,000). The zhipu section merges over built-in defaults, so an
older pricing file without it keeps working.

The plugin reads ~/.dsh/cost-pricing.json on boot (override the path with the
DSH_COST_PRICING env var or the row's config.pricingPath). On first run it
writes the default table to that path; edit it and restart 'dsh web' to apply
changes. A model without a models entry falls back to default.

## Install

The package declares a dsh.bundle manifest, so 'dsh plugin add' installs it and
adds it to the profile's bundle layers automatically:

    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-cost-meter-cny
    # restart the web profile, then refresh the page

Update to the latest commit:

    dsh plugin --profile web update dsh-cost-meter-cny

For a local checkout during development:

    dsh plugin --profile web add file:/path/to/dsh-selfuse-plugins/packages/dsh-cost-meter-cny

NOTE: if you were using @steven-wu/dsh-cost-meter, remove it from the same
profile first — both plugins render a cost badge and would double up.

## How it works

It is a dual-face dsh.client package:

- **Host half** (lib/index.js) registers a sessionCostCny projection on the
  session-projection seam. The fold tracks provider/model from request/header
  events and accumulates CNY cost from provider-reported usage buckets (uncached
  input / output / cache-read / cache-write), reusing token-meter's "replace
  the same (turn, step) sample instead of double-counting" rule. Usage from
  non-DeepSeek-series models is skipped, and the view exposes a `deepSeek` flag
  telling the client whether the active model is billable under this tariff.
  The view exposes whole-session totals plus a byTurn map keyed by turn number.
- **Client half** (lib/client.js) registers a badge into the
  conversation.chat.assistant-actions slot — the action row at the end of each
  assistant message. Each badge shows that turn's cost; hovering opens a tooltip
  with the per-bucket breakdown (input / output / cache-read / cache-write),
  the active tier, and the session total.

  Each badge also shows a **live peak/off-peak pill** next to the cost label
  (e.g. `¥0.12  ●高峰` or `¥0.12  ●闲时`). Unlike the tooltip's `tier` line —
  which reflects the tier active at the *last priced usage event* — the pill
  reflects the *current wall-clock moment* in the pricing timezone
  (`Asia/Shanghai` by default). It re-checks every 30 s, so it flips over at the
  hour boundary even with no new activity. The pill is colored (red for peak,
  green for off-peak) and shows a `现在 高峰/闲时 (实时)` line in the tooltip.

The sessionCostCny projection is delivered through the same seam as tokenUsage /
sessionStats, so it also appears in every projection carrier (history tail page,
session/projection push frames) without extra wiring.

## License

MIT
