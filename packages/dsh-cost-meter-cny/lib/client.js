window.__ModuleLoader__.load({
  id: "dsh-cost-meter-cny",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let react = require("react");

    var css = ".dsh-cost-badge{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-variant-numeric:tabular-nums;font-weight:500;color:var(--dsw-alias-label-secondary,#6b7280);cursor:default;user-select:none;padding:0 2px}.dsh-cost-tip{position:fixed;z-index:99999;background:var(--dsw-alias-bg-elevated,#fff);color:var(--dsw-alias-label-primary,#111827);border:1px solid var(--dsw-alias-border-l1,#e5e7eb);border-radius:8px;padding:8px 10px;font-size:12px;line-height:1.7;white-space:pre-line;box-shadow:0 6px 24px rgba(0,0,0,.14);pointer-events:none;max-width:360px}.dsh-cost-tier{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:600;line-height:1;padding:1px 6px;border-radius:999px;letter-spacing:.02em}.dsh-cost-tier--peak{color:#b42318;background:rgba(217,45,32,.12)}.dsh-cost-tier--offpeak{color:#067647;background:rgba(6,118,71,.12)}.dsh-cost-tier-dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex:none}";
    var tagId = "dsh-cost-meter-cny/badge.css";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
      var tag = document.createElement("style");
      tag.dataset.plugin = "dsh-cost-meter-cny";
      tag.dataset.pluginCss = tagId;
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    function formatCny(n) {
      if (typeof n !== "number" || !Number.isFinite(n)) return null;
      if (n >= 1) return "¥" + n.toFixed(2);
      if (n >= 0.01) return "¥" + n.toFixed(4);
      return "¥" + n.toFixed(6);
    }

    function pad2(n) {
      n = Number(n);
      return (n < 10 ? "0" : "") + n;
    }

    function tierLabel(tier) {
      return tier === "peak" ? "高峰时段" : "空闲时段";
    }

    function peakText(cost) {
      if (!cost || !Array.isArray(cost.peakHours)) return "";
      var hours = cost.peakHours.map(function (r) {
        return pad2(r[0]) + ":00-" + pad2(r[1]) + ":00";
      }).join(", ");
      return "tier        " + tierLabel(cost.tier) + (hours ? "  (高峰 " + hours + " " + (cost.timezone || "") + ")" : "");
    }

    // Real-time tier helpers. These answer "what is the tier RIGHT NOW" (the
    // current wall-clock instant in the pricing timezone), which is distinct
    // from cost.tier (the tier active at the last priced usage event).
    function hourInTz(timeMs, timezone) {
      try {
        var parts = new Intl.DateTimeFormat("en-US", {
          timeZone: timezone,
          hour: "2-digit",
          hourCycle: "h23",
        }).formatToParts(new Date(timeMs));
        for (var i = 0; i < parts.length; i++) {
          if (parts[i].type === "hour") {
            var n = Number(parts[i].value);
            if (Number.isFinite(n)) return n;
          }
        }
      } catch (e) { /* unknown timezone -> fall through */ }
      // Fallback: UTC+8 (Asia/Shanghai's offset).
      return new Date(timeMs + 8 * 3600 * 1000).getUTCHours();
    }

    function dayInTz(timeMs, timezone) {
      var names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      try {
        var parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).formatToParts(new Date(timeMs));
        for (var i = 0; i < parts.length; i++) {
          if (parts[i].type === "weekday") {
            var idx = names.indexOf(parts[i].value);
            if (idx >= 0) return idx;
          }
        }
      } catch (e) { /* unknown timezone -> fall through */ }
      return new Date(timeMs).getUTCDay();
    }

    function tierAtNow(peakHours, timezone, peakDays) {
      if (!Array.isArray(peakHours) || peakHours.length === 0) return null;
      // Outside the configured peak days (e.g. weekends) the tier is off-peak.
      if (Array.isArray(peakDays) && peakDays.length > 0) {
        if (peakDays.indexOf(dayInTz(Date.now(), timezone)) === -1) return "offpeak";
      }
      var hour = hourInTz(Date.now(), timezone);
      for (var i = 0; i < peakHours.length; i++) {
        var start = peakHours[i][0];
        var end = peakHours[i][1];
        if (hour >= start && hour < end) return "peak";
      }
      return "offpeak";
    }

    // Re-render on an interval so the live tier flips over at the hour boundary
    // even when no new usage event arrives. Returns "peak" | "offpeak" | null.
    function useNowTier(peakHours, timezone, peakDays) {
      var tick = react.useState(0);
      var setTick = tick[1];
      react.useEffect(function () {
        var id = setInterval(function () { setTick(function (n) { return n + 1; }); }, 30000);
        return function () { clearInterval(id); };
      }, []);
      return tierAtNow(peakHours, timezone, peakDays);
    }
    function CostChip(props) {
      var hoverState = react.useState(false);
      var hover = hoverState[0];
      var setHover = hoverState[1];
      var posState = react.useState(null);
      var pos = posState[0];
      var setPos = posState[1];

      function onEnter(ev) {
        var r = ev.currentTarget.getBoundingClientRect();
        setPos({ top: r.bottom + 6, left: r.left });
        setHover(true);
      }
      function onLeave() {
        setHover(false);
      }

      var tip = hover && pos
        ? react.createElement("span", {
            className: "dsh-cost-tip",
            style: { top: pos.top + "px", left: pos.left + "px" },
            role: "tooltip",
          }, props.lines.join("\n"))
        : null;

      // Live "current time" tier pill shown beside the cost label.
      var tierTag = props.tier
        ? react.createElement("span", {
            className: "dsh-cost-tier dsh-cost-tier--" + (props.tier === "peak" ? "peak" : "offpeak"),
            title: props.tier === "peak" ? "当前为高峰时段" : "当前为闲时时段",
          },
            react.createElement("span", { className: "dsh-cost-tier-dot" }),
            react.createElement("span", null, props.tier === "peak" ? "高峰" : "闲时"))
        : null;

      return react.createElement("span", {
        className: "dsh-cost-badge",
        onMouseEnter: onEnter,
        onMouseLeave: onLeave,
      }, props.label, tierTag, tip);
    }

    function bucketLines(head, c, cost) {
      var lines = [
        head,
        "input        " + formatCny(c.input) + "   (" + c.inputTokens + " tok)",
        "output      " + formatCny(c.output) + "   (" + c.outputTokens + " tok)",
        "cache-read  " + formatCny(c.cacheRead) + "   (" + c.cacheReadTokens + " tok)",
        "cache-write " + formatCny(c.cacheWrite) + "   (" + c.cacheWriteTokens + " tok)",
      ];
      var tier = peakText(cost);
      if (tier) lines.push(tier);
      return lines;
    }

    // Session total, shown persistently in the session header utilities.
    function SessionCostBadge(props) {
      var cost = props.useProjection ? props.useProjection("sessionCostCny") : void 0;
      var currentTier = useNowTier(cost && cost.peakHours, cost && cost.timezone, cost && cost.peakDays);
      if (!cost || cost.priced !== true) return null;
      var label = formatCny(cost.total);
      if (label === null) return null;
      var lines = bucketLines("session: " + label, cost, cost);
      if (cost.model) lines.push(cost.provider + "/" + cost.model);
      if (currentTier) lines.push("现在        " + tierLabel(currentTier) + " (实时)");
      return react.createElement(CostChip, { label: label, lines: lines, tier: currentTier });
    }

    // Per-turn cost, shown at the end of each assistant message.
    function TurnCostBadge(props) {
      var useProjection = props.useProjection;
      var useSession = props.useSession;
      var messageId = props.messageId;

      var cost = useProjection ? useProjection("sessionCostCny") : void 0;
      var nodes = useSession ? useSession(function (s) { return s ? s.nodes : void 0; }) : void 0;
      var currentTier = useNowTier(cost && cost.peakHours, cost && cost.timezone, cost && cost.peakDays);

      if (!cost || cost.priced !== true) return null;

      var turn = null;
      if (nodes && messageId != null) {
        for (var i = 0; i < nodes.length; i++) {
          var n = nodes[i];
          if (n && n.kind === "assistant" && n.messageId === messageId) { turn = n.turn; break; }
        }
      }

      var t = turn != null && cost.byTurn ? cost.byTurn[String(turn)] : void 0;
      if (!t || t.total <= 0) return null;
      var label = formatCny(t.total);
      if (label === null) return null;

      var lines = bucketLines("turn " + turn + ": " + label, t, t);
      lines.push("session     " + formatCny(cost.total));
      if (currentTier) lines.push("现在        " + tierLabel(currentTier) + " (实时)");

      return react.createElement(CostChip, { label: label, lines: lines, tier: currentTier });
    }

    var inject = ["slots"];

    function apply(ctx) {
      ctx.slots.inject("conversation.session.header.utilities", () => {
        ctx.slots.register({
          name: "conversation.session.header.utilities",
          id: "cost-meter-cny-session",
          order: 50,
        }, SessionCostBadge);
      });
      ctx.slots.inject("conversation.chat.assistant-actions", () => {
        ctx.slots.register({
          name: "conversation.chat.assistant-actions",
          id: "cost-meter-cny-turn",
          order: 50,
        }, TurnCostBadge);
      });
    }

    exports.SessionCostBadge = SessionCostBadge;
    exports.TurnCostBadge = TurnCostBadge;
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
