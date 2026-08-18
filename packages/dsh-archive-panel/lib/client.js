window.__ModuleLoader__.load({
  id: "dsh-archive-panel",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let React = require("react");
    let ReactDOM = require("react-dom");

    const CSS = ".dap-trigger{position:relative;box-sizing:border-box;display:flex;align-items:center;gap:6px;width:100%;height:36px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#5b5f66);cursor:pointer;font:inherit;font-size:13px;padding:0 8px}\n.dap-trigger:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));color:var(--dsw-alias-label-primary,#111418)}\n.dap-trigger[data-wide=rail]{width:36px;justify-content:center;padding:0;margin:0 auto}\n.dap-triggerLabel{flex:1;min-width:0;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.dap-badge{flex:none;min-width:16px;height:16px;line-height:16px;border-radius:8px;background:var(--dsw-static-deepseek-500,#4176e6);color:#fff;font-size:10px;font-weight:600;padding:0 5px;box-sizing:border-box;text-align:center}\n.dap-trigger[data-wide=rail] .dap-badge{position:absolute;right:-4px;top:-4px;min-width:15px;height:15px;line-height:15px;padding:0 3px}\n.dap-overlay{position:fixed;inset:0;z-index:2100;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.4);padding:24px}\n.dap-modal{width:520px;max-width:100%;max-height:72vh;display:flex;flex-direction:column;background:var(--dsw-specific-menu,var(--dsw-alias-bg-overlay,#fff));border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:16px;box-shadow:var(--dsw-shadow-lv3,0 12px 32px rgba(0,0,0,.2));overflow:hidden}\n.dap-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06))}\n.dap-title{margin:0;font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary,#111418)}\n.dap-close{width:28px;height:28px;border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-secondary,#5b5f66);cursor:pointer;font-size:18px;line-height:1;flex:none}\n.dap-close:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}\n.dap-body{padding:8px;overflow:auto;display:flex;flex-direction:column;gap:4px}\n.dap-empty{margin:0;padding:28px 12px;text-align:center;color:var(--dsw-alias-label-tertiary,#8a9099);font-size:13px}\n.dap-row{display:flex;align-items:center;gap:8px;padding:8px;border-radius:10px}\n.dap-row:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.04))}\n.dap-rowMain{flex:1;min-width:0}\n.dap-rowTitle{font-size:13px;font-weight:500;color:var(--dsw-alias-label-primary,#111418);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.dap-rowMeta{font-size:12px;color:var(--dsw-alias-label-tertiary,#8a9099);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}\n.dap-rowActions{flex:none;display:flex;gap:6px}\n.dap-btn{appearance:none;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));background:transparent;color:var(--dsw-alias-label-primary,#111418);border-radius:8px;padding:5px 8px;font:inherit;font-size:12px;cursor:pointer;line-height:1.4;white-space:nowrap}\n.dap-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}\n.dap-btn:disabled{opacity:.5;cursor:default}\n.dap-btnPrimary{background:var(--dsw-static-deepseek-500,#4176e6);border-color:transparent;color:#fff}\n.dap-btnPrimary:hover{background:var(--dsw-alias-state-business-primary,#3565c9)}\n.dap-btnDanger{color:var(--dsw-alias-label-error,#d33);border-color:rgba(220,60,60,.35)}\n.dap-btnDanger:hover{background:rgba(220,60,60,.08)}\n.dap-btnArm{background:rgba(220,60,60,.14);border-color:rgba(220,60,60,.55);font-weight:600}\n.dap-hint{margin:0;padding:10px 12px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));color:var(--dsw-alias-label-tertiary,#8a9099);font-size:12px;line-height:1.5}\n.dap-error{margin:8px 0 0;padding:8px 12px;border-radius:8px;background:rgba(220,60,60,.12);color:var(--dsw-alias-label-error,#d33);font-size:12px}";
    const CSS_TAG_ID = "dsh-archive-panel/style.css";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(CSS_TAG_ID) + "]") === null) {
      const tag = document.createElement("style");
      tag.dataset.plugin = "dsh-archive-panel";
      tag.dataset.pluginCss = CSS_TAG_ID;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    function ArchiveIcon() {
      return React.createElement("svg", {
        width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true",
        children: React.createElement("path", {
          d: "M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5V5H2V3.5ZM2 6h12v6.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5V6Zm4 2h4v1.5H6V8Z",
          fill: "currentColor"
        })
      });
    }

    function apply(ctx) {
      const useWorkspaces = () => React.useSyncExternalStore(ctx.workspaces.list.subscribe, ctx.workspaces.list.getSnapshot);
      const useSessions = () => React.useSyncExternalStore(ctx.sessions.list.subscribe, ctx.sessions.list.getSnapshot);

      const post = async (path, sessionId) => {
        const response = await fetch(path, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId })
        });
        let body = null;
        try { body = await response.json(); } catch { body = null; }
        if (!response.ok) {
          const message = body && typeof body.error === "string" ? body.error : "HTTP " + response.status;
          throw new Error(message);
        }
        return body;
      };

      const unarchive = (sessionId) => post("/api/dsh-archive/unarchive", sessionId);
      const deleteSession = (sessionId) => post("/api/dsh-archive/delete", sessionId);

      const waitUntilUnarchived = async (sessionId, timeoutMs) => {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
          const snapshot = ctx.workspaces.list.getSnapshot();
          const archived = Array.isArray(snapshot.archivedSessionIds) ? snapshot.archivedSessionIds : [];
          if (archived.indexOf(sessionId) === -1) return;
          await new Promise((resolve) => setTimeout(resolve, 80));
        }
      };

      function ArchiveModal(props) {
        const ws = useWorkspaces();
        const ss = useSessions();
        const [busy, setBusy] = React.useState(null);
        const [error, setError] = React.useState(null);
        const [arm, setArm] = React.useState(null);

        const archivedIds = Array.isArray(ws.archivedSessionIds) ? ws.archivedSessionIds : [];
        const items = Array.isArray(ws.items) ? ws.items : [];
        const byId = ss.byId || {};

        const rows = archivedIds.map((id) => {
          const summary = byId[id] || {};
          let workspaceTitle = "";
          for (const w of items) {
            if (w && Array.isArray(w.sessionIds) && w.sessionIds.indexOf(id) !== -1) {
              workspaceTitle = typeof w.title === "string" ? w.title : "";
              break;
            }
          }
          return {
            id: id,
            title: summary.displayTitle || summary.title || id,
            workspaceTitle: workspaceTitle
          };
        });

        const doRestore = async (id, andOpen) => {
          setBusy(id);
          setError(null);
          try {
            await unarchive(id);
            if (andOpen) {
              await waitUntilUnarchived(id, 3000);
              ctx.sessions.open(id);
              props.onClose();
            }
          } catch (reason) {
            setError(reason && reason.message ? reason.message : String(reason));
          } finally {
            setBusy(null);
          }
        };

        const armDelete = (id) => {
          setArm(id);
          window.setTimeout(() => {
            setArm((current) => (current === id ? null : current));
          }, 4000);
        };

        const doDelete = async (id) => {
          setBusy(id);
          setError(null);
          try {
            await deleteSession(id);
            setArm(null);
          } catch (reason) {
            setError(reason && reason.message ? reason.message : String(reason));
          } finally {
            setBusy(null);
          }
        };

        return ReactDOM.createPortal(
          React.createElement("div", {
            className: "dap-overlay",
            onClick: (event) => { if (event.target === event.currentTarget) props.onClose(); }
          },
            React.createElement("div", { className: "dap-modal", role: "dialog", "aria-modal": "true", "aria-label": "归档会话" },
              React.createElement("div", { className: "dap-head" },
                React.createElement("h2", { className: "dap-title" }, "归档会话"),
                React.createElement("button", { type: "button", className: "dap-close", "aria-label": "关闭", onClick: props.onClose }, "×")
              ),
              React.createElement("div", { className: "dap-body" },
                rows.length === 0
                  ? React.createElement("p", { className: "dap-empty" }, "没有归档的会话。")
                  : rows.map((row) => React.createElement("div", { key: row.id, className: "dap-row" },
                      React.createElement("div", { className: "dap-rowMain" },
                        React.createElement("div", { className: "dap-rowTitle", title: row.id }, row.title),
                        React.createElement("div", { className: "dap-rowMeta" }, row.workspaceTitle !== "" ? row.workspaceTitle : "未归属工作区")
                      ),
                      React.createElement("div", { className: "dap-rowActions" },
                        React.createElement("button", { type: "button", className: "dap-btn", disabled: busy === row.id, onClick: () => doRestore(row.id, false) }, busy === row.id ? "…" : "恢复"),
                        React.createElement("button", { type: "button", className: "dap-btn dap-btnPrimary", disabled: busy === row.id, onClick: () => doRestore(row.id, true) }, "恢复并打开"),
                        React.createElement("button", {
                          type: "button",
                          className: "dap-btn dap-btnDanger" + (arm === row.id ? " dap-btnArm" : ""),
                          disabled: busy === row.id,
                          title: "永久删除会话及其日志，无法恢复",
                          onClick: () => { if (arm === row.id) doDelete(row.id); else armDelete(row.id); }
                        }, busy === row.id ? "…" : arm === row.id ? "确认删除？" : "删除")
                      )
                    ))
              ),
              rows.length > 0
                ? React.createElement("p", { className: "dap-hint" }, "「删除」会永久清除会话日志与记录，且无法恢复。")
                : null,
              error !== null
                ? React.createElement("p", { className: "dap-error" }, error)
                : null
            )
          ),
          document.body
        );
      }

      function ArchiveEntry(props) {
        const ws = useWorkspaces();
        const [open, setOpen] = React.useState(false);
        const archivedIds = Array.isArray(ws.archivedSessionIds) ? ws.archivedSessionIds : [];
        const count = archivedIds.length;
        const wide = props.wide === true;
        return React.createElement(React.Fragment, null,
          React.createElement("button", {
            type: "button",
            className: "dap-trigger",
            "data-wide": wide ? "wide" : "rail",
            title: "归档会话",
            "aria-label": "归档会话",
            onClick: () => setOpen(true),
            children: [
              React.createElement(ArchiveIcon, { key: "icon" }),
              wide ? React.createElement("span", { key: "label", className: "dap-triggerLabel" }, "归档") : null,
              count > 0 ? React.createElement("span", { key: "badge", className: "dap-badge" }, count > 99 ? "99+" : String(count)) : null
            ]
          }),
          open ? React.createElement(ArchiveModal, { key: "modal", onClose: () => setOpen(false) }) : null
        );
      }

      ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register(
        { name: "sidebar.footer.action", id: "archive-panel", order: 100 },
        ArchiveEntry
      ));
    }

    exports.apply = apply;
    exports.inject = ["slots", "workspaces", "sessions"];
    return module.exports;
  }
});
