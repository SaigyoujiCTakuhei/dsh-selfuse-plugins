window.__ModuleLoader__.load({
  id: "dsh-cost-meter-cny",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let react = require("react");

    var css = ".dsh-cost-badge{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-variant-numeric:tabular-nums;font-weight:500;color:var(--dsw-alias-label-secondary,#6b7280);cursor:default;user-select:none;padding:0 2px}.dsh-cost-tip{position:fixed;width:max-content;z-index:99999;background:var(--dsw-alias-tooltip-bg,#fff);color:var(--dsw-alias-label-primary,#111827);border:1px solid var(--dsw-alias-border-l1,#e5e7eb);border-radius:8px;padding:8px 10px;font-size:12px;line-height:1.7;white-space:pre-line;box-shadow:0 6px 24px rgba(0,0,0,.14);pointer-events:none;max-width:360px}.dsh-cost-tier{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:600;line-height:1;padding:1px 6px;border-radius:999px;letter-spacing:.02em}.dsh-cost-tier--peak{color:#b42318;background:rgba(217,45,32,.12)}.dsh-cost-tier--offpeak{color:#067647;background:rgba(6,118,71,.12)}.dsh-cost-tier-dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex:none}";
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

    // Family-aware amount formatting: DeepSeek ledgers are CNY, GLM Coding
    // Plan ledgers are subscription credits (积分).
    function formatAmount(n, family) {
      if (typeof n !== "number" || !Number.isFinite(n)) return null;
      if (family === "zhipu") {
        if (n >= 1) return n.toFixed(2) + " 积分";
        if (n >= 0.01) return n.toFixed(4) + " 积分";
        if (n === 0) return "0.00 积分";
        return n.toFixed(6) + " 积分";
      }
      return formatCny(n);
    }

    function pad2(n) {
      n = Number(n);
      return (n < 10 ? "0" : "") + n;
    }

    function tierLabel(family, tier) {
      if (tier === "peak") return "高峰时段";
      return family === "zhipu" ? "非高峰时段 (积分半价)" : "空闲时段";
    }

    function peakText(family, cost) {
      if (!cost || !Array.isArray(cost.peakHours)) return "";
      var hours = cost.peakHours.map(function (r) {
        return pad2(r[0]) + ":00-" + pad2(r[1]) + ":00";
      }).join(", ");
      return "tier        " + tierLabel(family, cost.tier) + (hours ? "  (高峰 " + hours + " " + (cost.timezone || "") + ")" : "");
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
        var vw = window.innerWidth, vh = window.innerHeight;
        var estH = props.lines.length * 20.4 + 18;
        var p = { top: r.bottom + 6 };
        if (r.left + 368 > vw) { p.right = vw - r.right; } else { p.left = r.left; }
        if (r.bottom + 6 + estH > vh) { p.top = r.top - 6 - estH; }
        setPos(p);
        setHover(true);
      }
      function onLeave() {
        setHover(false);
      }

      var tip = hover && pos
        ? react.createElement("span", {
            className: "dsh-cost-tip",
            style: { top: pos.top + "px", left: pos.left != null ? pos.left + "px" : void 0, right: pos.right != null ? pos.right + "px" : void 0 },
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

    function bucketLines(head, c, cost, family) {
      var f = function (n) { return formatAmount(n, family) || "—"; };
      var lines = [
        head,
        "input        " + f(c.input) + "   (" + c.inputTokens + " tok)",
        "output      " + f(c.output) + "   (" + c.outputTokens + " tok)",
        "cache-read  " + f(c.cacheRead) + "   (" + c.cacheReadTokens + " tok)",
        "cache-write " + f(c.cacheWrite) + "   (" + c.cacheWriteTokens + " tok)",
      ];
      var tier = peakText(family, cost);
      if (tier) lines.push(tier);
      return lines;
    }

    // Real-time composer model selection. The picker seat and the /model popup
    // share one per-session ModelDirectory (ctx.modelDirectories) whose
    // snapshot carries the current { provider, model } and updates the moment
    // the picker commits — no request needed. The context is captured at
    // apply but the service is resolved LAZILY at first render: module load
    // order does not guarantee the model-selection service is registered by
    // then, and a null captured here used to silently pin the badges to the
    // fold's lagging request/header gate forever.
    var pluginCtx = null;

    var noopSubscribe = function () { return function () {}; };

    // React face of the shared directory: subscribe + getSnapshot, exactly as
    // the built-in ModelSelect seat consumes it. Resolves the directory once
    // per component instance; unknown sessions resolve to null (fail-soft).
    function useSelectedModel(sessionId) {
      var dirPair = react.useState(function () {
        if (pluginCtx == null || sessionId == null) return null;
        try {
          var dirs = pluginCtx.modelDirectories;
          if (dirs == null) return null;
          var d = dirs.directoryFor(sessionId);
          // The raw directory keeps the reactive face on `.store`
          // (createSnapshotStore); accept a direct subscribe/getSnapshot face too.
          var store = d && d.store ? d.store : d;
          if (!store || !store.subscribe || !store.getSnapshot) return null;
          return store;
        } catch (e) {
          return null;
        }
      });
      var store = dirPair[0];
      var snap = react.useSyncExternalStore(
        store ? function (cb) { return store.subscribe(cb); } : noopSubscribe,
        store ? function () { return store.getSnapshot(); } : function () { return null; }
      );
      return (store && snap && snap.current) || null;
    }

    // Whether a DeepSeek-series model is billable right now. The picker's
    // live selection wins; before the seat has loaded (or if the
    // model-selection service is unavailable) fall back to the fold's last
    // request/header, the pre-selection behaviour.
    function classifyFamilySel(sel) {
      if (!sel) return null;
      var hay = ((sel.provider || "") + "/" + (sel.model || "")).toLowerCase();
      if (hay.indexOf("deepseek") !== -1) return "deepseek";
      if (hay.indexOf("glm") !== -1 || hay.indexOf("zhipu") !== -1 || hay.indexOf("bigmodel") !== -1) return "zhipu";
      return null;
    }

    function familyNowOf(props, cost) {
      var selected = useSelectedModel(props.sessionId);
      // The live picker is authoritative whenever it has a selection — even
      // when that selection classifies as unknown (badges must hide, not fall
      // back to the fold's stale family). The fold only covers the window
      // before the directory has loaded a selection at all.
      if (selected != null) return classifyFamilySel(selected);
      return (cost && cost.family) || null;
    }

    // Session total, shown persistently in the session header utilities.
    function SessionCostBadge(props) {
      var cost = props.useProjection ? props.useProjection("sessionCostCny") : void 0;
      var familyNow = familyNowOf(props, cost);
      var famWindows = (familyNow && cost && cost.peakHoursByFamily && cost.peakHoursByFamily[familyNow]) || (cost && cost.peakHours) || null;
      var famPeakDays = (familyNow && cost && cost.peakDaysByFamily && cost.peakDaysByFamily[familyNow]) || (cost && cost.peakDays) || null;
      var currentTier = useNowTier(famWindows, cost && cost.timezone, famPeakDays);
      // Ledger of the family on deck: switching to GLM shows the credit
      // ledger (0 积分 in a session with no GLM usage yet), switching to
      // DeepSeek shows the CNY ledger, anything unknown hides both. Each
      // family's total survives the detour — ledgers never mix or reset.
      var famLedger = (familyNow && cost && cost.byFamily && cost.byFamily[familyNow]) || null;
      if (!cost || !familyNow || !famLedger) return null;
      var label = formatAmount(famLedger.total, familyNow);
      if (label === null) return null;
      var lines = bucketLines("session: " + label, famLedger, famLedger, familyNow);
      if (cost.model) lines.push(cost.provider + "/" + cost.model);
      if (currentTier) lines.push("现在        " + tierLabel(familyNow, currentTier) + " (实时)");
      var tbf = cost.totalByFamily;
      if (tbf) {
        var parts = [];
        if (tbf.deepseek > 0) parts.push("DeepSeek " + formatAmount(tbf.deepseek, "deepseek"));
        if (tbf.zhipu > 0) parts.push("智谱 " + formatAmount(tbf.zhipu, "zhipu"));
        if (parts.length > 0) lines.push("本会话累计   " + parts.join(" · "));
      }
      return react.createElement(CostChip, { label: label, lines: lines, tier: currentTier });
    }

    // Per-turn cost, shown at the end of each assistant message. One turn
    // runs on one model, so the view tags each turn with the family that
    // priced it and this badge formats it in that family's currency.
    function TurnCostBadge(props) {
      var useProjection = props.useProjection;
      var useSession = props.useSession;
      var messageId = props.messageId;

      var cost = useProjection ? useProjection("sessionCostCny") : void 0;
      var nodes = useSession ? useSession(function (s) { return s ? s.nodes : void 0; }) : void 0;
      var familyNow = familyNowOf(props, cost);

      var turn = null;
      if (nodes && messageId != null) {
        for (var i = 0; i < nodes.length; i++) {
          var n = nodes[i];
          if (n && n.kind === "assistant" && n.messageId === messageId) { turn = n.turn; break; }
        }
      }

      var t = turn != null && cost && cost.byTurn ? cost.byTurn[String(turn)] : void 0;
      var tFamily = (t && t.family) || familyNow || "deepseek";
      var famWindows = (cost && cost.peakHoursByFamily && cost.peakHoursByFamily[tFamily]) || (cost && cost.peakHours) || null;
      var famPeakDays = (cost && cost.peakDaysByFamily && cost.peakDaysByFamily[tFamily]) || (cost && cost.peakDays) || null;
      var currentTier = useNowTier(famWindows, cost && cost.timezone, famPeakDays);

      if (!cost || !familyNow) return null;
      if (!t || t.total <= 0) return null;
      var label = formatAmount(t.total, tFamily);
      if (label === null) return null;

      var lines = bucketLines("turn " + turn + ": " + label, t, t, tFamily);
      lines.push("session     " + (formatAmount(cost.totalByFamily ? cost.totalByFamily[tFamily] : cost.total, tFamily) || "—"));
      if (currentTier) lines.push("现在        " + tierLabel(tFamily, currentTier) + " (实时)");

      return react.createElement(CostChip, { label: label, lines: lines, tier: currentTier });
    }

    // "modelDirectories" must be DECLARED here: cordis rejects property access
    // to undeclared services ("cannot get property ... without inject"), and
    // declaring it also makes cordis wait for the service before calling
    // apply — the model-selection module ships in every web composition.
    var inject = ["slots", "modelDirectories"];

    function apply(ctx) {
      pluginCtx = ctx;
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
