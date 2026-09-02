window.__ModuleLoader__.load({
  id: "dsh-graceful-exit",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    var react = require("react");

    var css =
      ".dge-fab{position:fixed;right:16px;bottom:16px;z-index:30}.dge-btn{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--dsw-alias-border-l1,#e5e7eb);background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-secondary,#6b7280);font-size:12px;font-weight:500;line-height:1;padding:6px 10px;border-radius:10px;cursor:pointer;user-select:none;font-variant-numeric:tabular-nums;box-shadow:0 4px 16px rgba(0,0,0,.12);transition:color .15s,border-color .15s,background .15s}.dge-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.04));color:var(--dsw-alias-label-primary,#111827)}.dge-btn:focus-visible{outline:1px solid var(--dsw-alias-border-l1,#e5e7eb);outline-offset:1px}.dge-failed{border-color:var(--dsw-alias-state-error-primary,#dc2626);color:var(--dsw-alias-state-error-primary,#dc2626)}.dge-exiting{opacity:.6;cursor:default}.dge-bye{position:fixed;inset:0;z-index:40;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#111827);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;padding:24px}.dge-bye-title{font-size:20px;font-weight:600}.dge-bye-sub{font-size:14px;color:var(--dsw-alias-label-secondary,#6b7280)}.dge-bye-hint{font-size:12px;color:var(--dsw-alias-label-tertiary,#9ca3af)}";
    var tagId = "dsh-graceful-exit/button.css";
    if (
      typeof document !== "undefined" &&
      document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null
    ) {
      var tag = document.createElement("style");
      tag.dataset.plugin = "dsh-graceful-exit";
      tag.dataset.pluginCss = tagId;
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    var ROUTE = "/api/dsh-graceful-exit/shutdown";

    // Click → native confirm() dialog (same UX as the New_Architecture_v00
    // dashboard's shutdown module: browser popup with 确定/取消) → POST the
    // loopback shutdown route. On success the host acks first and SIGINTs
    // itself right after. Browsers forbid closing a tab the user opened
    // themselves, so "close the tab" is best-effort: try window.close() once
    // (works only for script-opened tabs), and take over the page with a
    // farewell screen otherwise so the dead server never shows as a broken
    // reconnecting UI. Failure keeps the fab and shows 退出失败 briefly.
    function ExitButton() {
      var phaseState = react.useState("idle");
      var phase = phaseState[0];
      var setPhase = phaseState[1];
      var timerRef = react.useRef(null);

      react.useEffect(function () {
        return function () {
          if (timerRef.current !== null) clearTimeout(timerRef.current);
        };
      }, []);

      function revertSoon() {
        if (timerRef.current !== null) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(function () {
          setPhase("idle");
        }, 4000);
      }

      function onClick() {
        if (phase === "exiting" || phase === "done") return;
        var ok = window.confirm("确定要优雅退出 dsh 吗？（等价于终端 Ctrl+C，成功后本页显示告别屏）");
        if (!ok) return;
        if (timerRef.current !== null) clearTimeout(timerRef.current);
        setPhase("exiting");
        fetch(ROUTE, { method: "POST", cache: "no-store" })
          .then(function (r) {
            if (r.ok) return;
            throw new Error("HTTP " + r.status);
          })
          .then(function () {
            setPhase("done");
            try {
              window.close();
            } catch (e) {
              /* browsers ignore it for user-opened tabs */
            }
          })
          .catch(function () {
            setPhase("failed");
            revertSoon();
          });
      }

      if (phase === "done") {
        return react.createElement(
          "div",
          { className: "dge-bye", "data-dsh-graceful-exit": "bye" },
          react.createElement("div", { className: "dge-bye-title" }, "⏻ dsh 已优雅退出"),
          react.createElement("div", { className: "dge-bye-sub" }, "服务已停止，此标签页可以关闭了"),
          react.createElement("div", { className: "dge-bye-hint" }, "重新使用请到终端运行 dsh web"),
        );
      }

      var label =
        phase === "exiting" ? "正在退出…" : phase === "failed" ? "退出失败" : "⏻ 退出";
      var cls =
        "dge-btn" + (phase === "failed" ? " dge-failed" : "") + (phase === "exiting" ? " dge-exiting" : "");
      var btn = react.createElement(
        "button",
        {
          className: cls,
          type: "button",
          onClick: onClick,
          title: "优雅退出 dsh（等价于在终端按 Ctrl+C）",
          "aria-label": "优雅退出 dsh",
        },
        label,
      );
      return react.createElement("div", { className: "dge-fab" }, btn);
    }

    var inject = ["slots"];

    // Register as a frame-wide floating entry (root scope, so it renders with
    // or without an open session) and anchor itself to the viewport's
    // bottom-right corner via .dge-fab. The shell.overlay layer is
    // pointer-events:none except its entries, so only the pill is clickable.
    function apply(ctx) {
      ctx.slots.inject("shell.overlay", () => {
        ctx.slots.register(
          {
            name: "shell.overlay",
            id: "graceful-exit",
            order: 100,
            label: "优雅退出",
          },
          ExitButton,
        );
      });
    }

    exports.ExitButton = ExitButton;
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
