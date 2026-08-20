window.__ModuleLoader__.load({
  id: "dsh-context-compression-status",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    var react = require("react");

    var css =
      ".dsh-cc-badge{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-variant-numeric:tabular-nums;font-weight:500;color:var(--dsw-alias-label-secondary,#6b7280);cursor:default;user-select:none;padding:0 2px}.dsh-cc-compressed{color:var(--dsw-alias-accent,#2563eb)}.dsh-cc-tip{position:fixed;z-index:99999;background:var(--dsw-alias-bg-elevated,#fff);color:var(--dsw-alias-label-primary,#111827);border:1px solid var(--dsw-alias-border-l1,#e5e7eb);border-radius:8px;padding:8px 10px;font-size:12px;line-height:1.7;white-space:pre-line;box-shadow:0 6px 24px rgba(0,0,0,.14);pointer-events:none;max-width:360px}";
    var tagId = "dsh-context-compression-status/badge.css";
    if (
      typeof document !== "undefined" &&
      document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null
    ) {
      var tag = document.createElement("style");
      tag.dataset.plugin = "dsh-context-compression-status";
      tag.dataset.pluginCss = tagId;
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    // Compact token count: 517 / 12.2K / 1.23M.
    function formatTokens(n) {
      if (typeof n !== "number" || !Number.isFinite(n)) return null;
      if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
      if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
      return String(Math.round(n));
    }

    // Presentational badge with a fixed-position hover tooltip showing the full
    // context-compression status: limit, usage, compressed flag, and count.
    function StatusChip(props) {
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

      var useProjection = props.useProjection;
      var pressure = useProjection ? useProjection("contextPressure") : void 0;
      var comp = useProjection ? useProjection("contextCompaction") : void 0;

      var contextWindow =
        pressure && typeof pressure.contextWindow === "number" ? pressure.contextWindow : null;
      var used =
        pressure && typeof pressure.projectedTokens === "number"
          ? pressure.projectedTokens
          : null;
      var count = comp && typeof comp.compactionCount === "number" ? comp.compactionCount : 0;
      var compressed = count > 0;
      var pct = contextWindow && used != null ? Math.round((used / contextWindow) * 100) : null;

      var label = compressed ? "🗜 " + count + "×" : "未压缩";

      var lines = [];
      lines.push("压缩状态: " + (compressed ? "已压缩 (" + count + " 次)" : "未压缩"));
      lines.push(
        "上下文上限: " + (contextWindow != null ? formatTokens(contextWindow) + " (" + contextWindow + ")" : "未知"),
      );
      lines.push(
        "当前用量: " + (used != null ? formatTokens(used) + (pct != null ? " (" + pct + "%)" : "") : "未知"),
      );
      if (comp && comp.lastCompaction) {
        var lc = comp.lastCompaction;
        var shadow = lc.shadowedTokenCount != null ? formatTokens(lc.shadowedTokenCount) : "?";
        lines.push("最近一次压缩: 缩减 ~" + shadow + " tokens" + (lc.model ? " · " + lc.model : ""));
      }

      var tip =
        hover && pos
          ? react.createElement(
              "span",
              { className: "dsh-cc-tip", style: { top: pos.top + "px", left: pos.left + "px" }, role: "tooltip" },
              lines.join("\n"),
            )
          : null;

      var cls = "dsh-cc-badge" + (compressed ? " dsh-cc-compressed" : "");
      return react.createElement(
        "span",
        { className: cls, onMouseEnter: onEnter, onMouseLeave: onLeave },
        label,
        tip,
      );
    }

    var inject = ["slots"];

    // Register a persistent badge in the conversation session header, next to the
    // existing context meter. The slot hands the component `useProjection`.
    function apply(ctx) {
      ctx.slots.inject("conversation.session.header.utilities", () => {
        ctx.slots.register(
          {
            name: "conversation.session.header.utilities",
            id: "context-compression-status",
            order: 60,
          },
          StatusChip,
        );
      });
    }

    exports.StatusChip = StatusChip;
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
