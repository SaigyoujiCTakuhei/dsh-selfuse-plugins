window.__ModuleLoader__.load({
  id: "dsh-archive-panel",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let React = require("react");
    let ReactDOM = require("react-dom");
    const h = React.createElement;

    const CSS = ".dap-trigger{position:relative;box-sizing:border-box;display:flex;align-items:center;gap:6px;width:100%;height:36px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#5b5f66);cursor:pointer;font:inherit;font-size:13px;padding:0 8px}\n.dap-trigger:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));color:var(--dsw-alias-label-primary,#111418)}\n.dap-trigger[data-wide=rail]{width:36px;justify-content:center;padding:0;margin:0 auto}\n.dap-triggerLabel{flex:1;min-width:0;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.dap-badge{flex:none;min-width:16px;height:16px;line-height:16px;border-radius:8px;background:var(--dsw-static-deepseek-500,#4176e6);color:#fff;font-size:10px;font-weight:600;padding:0 5px;box-sizing:border-box;text-align:center}\n.dap-trigger[data-wide=rail] .dap-badge{position:absolute;right:-4px;top:-4px;min-width:15px;height:15px;line-height:15px;padding:0 3px}\n.dap-overlay{position:fixed;inset:0;z-index:2100;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.4);padding:24px}\n.dap-modal{width:560px;max-width:100%;max-height:80vh;display:flex;flex-direction:column;background:var(--dsw-specific-menu,var(--dsw-alias-bg-overlay,#fff));border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:16px;box-shadow:var(--dsw-shadow-lv3,0 12px 32px rgba(0,0,0,.2));overflow:hidden}\n.dap-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06))}\n.dap-title{margin:0;font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary,#111418)}\n.dap-close{width:28px;height:28px;border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-secondary,#5b5f66);cursor:pointer;font-size:18px;line-height:1;flex:none}\n.dap-close:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}\n.dap-body{padding:8px;overflow:auto;display:flex;flex-direction:column;gap:4px}\n.dap-empty{margin:0;padding:28px 12px;text-align:center;color:var(--dsw-alias-label-tertiary,#8a9099);font-size:13px}\n.dap-row{display:flex;align-items:center;gap:8px;padding:8px;border-radius:10px}\n.dap-row:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.04))}\n.dap-rowMain{flex:1;min-width:0}\n.dap-rowTitle{font-size:13px;font-weight:500;color:var(--dsw-alias-label-primary,#111418);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.dap-rowMeta{font-size:12px;color:var(--dsw-alias-label-tertiary,#8a9099);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}\n.dap-rowActions{flex:none;display:flex;gap:6px}\n.dap-btn{appearance:none;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));background:transparent;color:var(--dsw-alias-label-primary,#111418);border-radius:8px;padding:5px 8px;font:inherit;font-size:12px;cursor:pointer;line-height:1.4;white-space:nowrap}\n.dap-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}\n.dap-btn:disabled{opacity:.5;cursor:default}\n.dap-btnPrimary{background:var(--dsw-static-deepseek-500,#4176e6);border-color:transparent;color:#fff}\n.dap-btnPrimary:hover{background:var(--dsw-alias-state-business-primary,#3565c9)}\n.dap-btnDanger{color:var(--dsw-alias-label-error,#d33);border-color:rgba(220,60,60,.35)}\n.dap-btnDanger:hover{background:rgba(220,60,60,.08)}\n.dap-btnArm{background:rgba(220,60,60,.14);border-color:rgba(220,60,60,.55);font-weight:600}\n.dap-hint{margin:0;padding:10px 12px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));color:var(--dsw-alias-label-tertiary,#8a9099);font-size:12px;line-height:1.5}\n.dap-error{margin:8px 0 0;padding:8px 12px;border-radius:8px;background:rgba(220,60,60,.12);color:var(--dsw-alias-label-error,#d33);font-size:12px}\n.dap-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06))}\n.dap-toolLabel{flex:none;font-size:12px;color:var(--dsw-alias-label-tertiary,#8a9099)}\n.dap-chips{display:flex;gap:4px;flex-wrap:wrap}\n.dap-chip{appearance:none;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));background:transparent;color:var(--dsw-alias-label-primary,#111418);border-radius:999px;padding:4px 10px;font:inherit;font-size:12px;cursor:pointer;line-height:1.4;white-space:nowrap}\n.dap-chip:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}\n.dap-chipActive{background:var(--dsw-static-deepseek-500,#4176e6);border-color:transparent;color:#fff}\n.dap-chipActive:hover{background:var(--dsw-alias-state-business-primary,#3565c9)}\n.dap-dirBtn{appearance:none;margin-left:auto;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));background:transparent;color:var(--dsw-alias-label-primary,#111418);border-radius:8px;padding:4px 10px;font:inherit;font-size:12px;cursor:pointer;line-height:1.4;white-space:nowrap}\n.dap-dirBtn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}\n.dap-searchRow{display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06))}\n.dap-searchInput{flex:1;min-width:0;box-sizing:border-box;height:32px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));border-radius:8px;background:var(--dsw-alias-bg-input,var(--dsw-alias-bg-overlay,#fff));color:var(--dsw-alias-label-primary,#111418);font:inherit;font-size:13px;padding:0 10px}\n.dap-searchInput:focus{outline:none;border-color:var(--dsw-static-deepseek-500,#4176e6)}\n.dap-filterRow{display:flex;align-items:center;gap:8px;padding:0 16px 10px}\n.dap-select{appearance:none;height:32px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));border-radius:8px;background:var(--dsw-alias-bg-input,var(--dsw-alias-bg-overlay,#fff));color:var(--dsw-alias-label-primary,#111418);font:inherit;font-size:13px;padding:0 8px}\n.dap-spacer{flex:1}\n.dap-previewOverlay{position:fixed;inset:0;z-index:2200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);padding:24px}\n.dap-previewModal{width:680px;max-width:100%;max-height:82vh;display:flex;flex-direction:column;background:var(--dsw-specific-menu,var(--dsw-alias-bg-overlay,#fff));border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:16px;box-shadow:var(--dsw-shadow-lv3,0 12px 32px rgba(0,0,0,.2));overflow:hidden}\n.dap-previewBody{overflow:auto;padding:12px 16px;display:flex;flex-direction:column;gap:10px}\n.dap-msgCard{border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:10px;padding:10px 12px;background:var(--dsw-alias-bg-overlay,#fff)}\n.dap-msgUser{border-left:3px solid var(--dsw-static-deepseek-500,#4176e6)}\n.dap-msgAssistant{border-left:3px solid var(--dsw-alias-label-tertiary,#8a9099)}\n.dap-msgRole{font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary,#5b5f66);margin-bottom:4px}\n.dap-msgText{font-size:13px;color:var(--dsw-alias-label-primary,#111418);white-space:pre-wrap;word-break:break-word;line-height:1.55}\n.dap-toast{position:absolute;left:16px;right:16px;bottom:12px;padding:8px 12px;border-radius:8px;background:rgba(40,140,80,.14);color:var(--dsw-alias-label-primary,#111418);font-size:12px;border:1px solid rgba(40,140,80,.3)}";

    const CSS_TAG_ID = "dsh-archive-panel/style.css";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(CSS_TAG_ID) + "]") === null) {
      const tag = document.createElement("style");
      tag.dataset.plugin = "dsh-archive-panel";
      tag.dataset.pluginCss = CSS_TAG_ID;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    function ArchiveIcon() {
      return h("svg", {
        width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true",
        children: h("path", {
          d: "M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5V5H2V3.5ZM2 6h12v6.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5V6Zm4 2h4v1.5H6V8Z",
          fill: "currentColor"
        })
      });
    }

    function formatDate(ts) {
      if (!ts) return "—";
      const d = new Date(ts);
      if (isNaN(d.getTime())) return "—";
      const pad = (n) => String(n).padStart(2, "0");
      return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    }

    function formatSize(bytes) {
      if (!bytes || bytes <= 0) return "0 B";
      const units = ["B", "KB", "MB", "GB"];
      let i = 0;
      let n = bytes;
      while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
      return (i === 0 ? String(n) : n.toFixed(1)) + " " + units[i];
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
          const message = (body && body.error) ? body.error : ("HTTP " + response.status);
          throw new Error(message);
        }
        return body;
      };

      const postJson = async (path, payload) => {
        const response = await fetch(path, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload === undefined ? {} : payload)
        });
        let body = null;
        try { body = await response.json(); } catch { body = null; }
        if (!response.ok) {
          const message = (body && body.error) ? body.error : ("HTTP " + response.status);
          throw new Error(message);
        }
        return body;
      };

      const unarchive = (sessionId) => post("/api/dsh-archive/unarchive", sessionId);
      const deleteSession = (sessionId) => post("/api/dsh-archive/delete", sessionId);

      const fetchMeta = async () => {
        try {
          const response = await fetch("/api/dsh-archive/meta", { method: "GET" });
          let body = null;
          try { body = await response.json(); } catch { body = null; }
          if (response.ok && body && Array.isArray(body.items)) {
            const map = {};
            for (const item of body.items) {
              if (item && typeof item.id === "string") map[item.id] = item;
            }
            return map;
          }
        } catch { /* best effort */ }
        return {};
      };

      const fetchDetail = async (sessionId) => {
        const response = await fetch("/api/dsh-archive/detail?sessionId=" + encodeURIComponent(sessionId), { method: "GET" });
        let body = null;
        try { body = await response.json(); } catch { body = null; }
        if (!response.ok) throw new Error((body && body.error) ? body.error : ("HTTP " + response.status));
        return body;
      };

      const waitUntilUnarchived = async (sessionId, timeoutMs) => {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
          const snapshot = ctx.workspaces.list.getSnapshot();
          const archived = Array.isArray(snapshot.archivedSessionIds) ? snapshot.archivedSessionIds : [];
          if (archived.indexOf(sessionId) === -1) return;
          await new Promise((resolve) => setTimeout(resolve, 80));
        }
      };

      const archivedIdsKey = (ws) => {
        const archivedIds = Array.isArray(ws.archivedSessionIds) ? ws.archivedSessionIds : [];
        return archivedIds.join("|");
      };

      const SORT_STORAGE_KEY = "dsh-archive-panel:sort";
      const SORT_KEY_VALUES = ["archived", "time", "name", "date"];
      const loadSortPref = () => {
        try {
          const raw = window.localStorage.getItem(SORT_STORAGE_KEY);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            const key = SORT_KEY_VALUES.indexOf(parsed.key) !== -1 ? parsed.key : "archived";
            const dir = parsed.dir === "asc" || parsed.dir === "desc" ? parsed.dir : "desc";
            return { key, dir };
          }
        } catch { /* ignore corrupt storage */ }
        return null;
      };
      const saveSortPref = (key, dir) => {
        try {
          window.localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ key, dir }));
        } catch { /* storage may be unavailable; ignore */ }
      };

      function ArchiveModal(props) {
        const ws = useWorkspaces();
        const ss = useSessions();
        const [busy, setBusy] = React.useState(null);
        const [error, setError] = React.useState(null);
        const [toast, setToast] = React.useState(null);
        const [arm, setArm] = React.useState(null);
        const [meta, setMeta] = React.useState({});
        const initialSort = loadSortPref();
        const [sortKey, setSortKey] = React.useState(initialSort ? initialSort.key : "archived");
        const [sortDir, setSortDir] = React.useState(initialSort ? initialSort.dir : "desc");
        const [query, setQuery] = React.useState("");
        const [selectedWs, setSelectedWs] = React.useState("ALL");
        const [preview, setPreview] = React.useState(null);
        const metaKey = archivedIdsKey(ws);

        React.useEffect(() => {
          let cancelled = false;
          (async () => {
            const map = await fetchMeta();
            if (!cancelled) setMeta(map);
          })();
          return () => { cancelled = true; };
        }, [metaKey]);
        React.useEffect(() => {
          saveSortPref(sortKey, sortDir);
        }, [sortKey, sortDir]);
        React.useEffect(() => {
          if (!toast) return undefined;
          const t = setTimeout(() => setToast(null), 3000);
          return () => clearTimeout(t);
        }, [toast]);

        const archivedIds = Array.isArray(ws.archivedSessionIds) ? ws.archivedSessionIds : [];
        const items = Array.isArray(ws.items) ? ws.items : [];
        const byId = ss.byId || {};
        const metaMap = meta || {};

        const SORT_KEYS = ["archived", "time", "name", "date"];
        const SORT_LABELS = { archived: "归档顺序", time: "时间", name: "名称", date: "日期" };
        const compareRows = (a, b) => {
          if (sortKey === "time") return (a.updatedAt || 0) - (b.updatedAt || 0);
          if (sortKey === "date") return (a.createdAt || 0) - (b.createdAt || 0);
          if (sortKey === "name") return String(a.title).localeCompare(String(b.title), "zh");
          return a.index - b.index; // archived: natural array order (oldest first)
        };

        const allRows = archivedIds.map((id, index) => {
          const summary = byId[id] || {};
          let workspaceTitle = "";
          for (const w of items) {
            if (w && Array.isArray(w.sessionIds) && w.sessionIds.indexOf(id) !== -1) {
              workspaceTitle = typeof w.title === "string" ? w.title : "";
              break;
            }
          }
          const m = metaMap[id] || {};
          return {
            id,
            index,
            title: summary.displayTitle || summary.title || id,
            workspaceTitle,
            createdAt: typeof m.createdAt === "number" ? m.createdAt : 0,
            updatedAt: typeof summary.updatedAt === "number" ? summary.updatedAt : 0,
            turns: typeof m.turns === "number" ? m.turns : 0,
            dataSize: typeof m.dataSize === "number" ? m.dataSize : 0
          };
        });

        const q = query.trim().toLowerCase();
        const filtered = allRows.filter((r) => {
          if (selectedWs !== "ALL" && r.workspaceTitle !== selectedWs) return false;
          if (q) {
            const mt = (r.title || "").toLowerCase().indexOf(q) >= 0;
            const mw = (r.workspaceTitle || "").toLowerCase().indexOf(q) >= 0;
            if (!mt && !mw) return false;
          }
          return true;
        });

        const rows = filtered.slice().sort((a, b) => (sortDir === "asc" ? compareRows(a, b) : -compareRows(a, b)));

        const wsOptions = [];
        const seenWs = {};
        for (const r of allRows) {
          const n = r.workspaceTitle || "未归属工作区";
          if (!seenWs[n]) { seenWs[n] = true; wsOptions.push(n); }
        }

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

        const doDeleteAll = async () => {
          if (archivedIds.length === 0) return;
          if (!window.confirm("确认彻底删除全部 " + archivedIds.length + " 个归档会话？\n磁盘文件与记录将一并移除，无法恢复！")) return;
          setBusy("all");
          setError(null);
          try {
            const body = await postJson("/api/dsh-archive/delete-all", {});
            setBusy(null);
            setToast("已彻底删除 " + (body && typeof body.removed === "number" ? body.removed : archivedIds.length) + " 个归档会话。");
          } catch (reason) {
            setBusy(null);
            setError(reason && reason.message ? reason.message : String(reason));
          }
        };

        const openPreview = (id, title) => {
          setPreview({ id, title, loading: true, data: null, error: null });
          fetchDetail(id).then((d) => {
            setPreview((p) => (p && p.id === id ? { ...p, loading: false, data: d } : p));
          }).catch((e) => {
            setPreview((p) => (p && p.id === id ? { ...p, loading: false, error: e.message || String(e) } : p));
          });
        };
        const closePreview = () => setPreview(null);

        const previewNode = preview ? h("div", { className: "dap-previewOverlay", onClick: (e) => { if (e.target === e.currentTarget) closePreview(); } },
          h("div", { className: "dap-previewModal", role: "dialog", "aria-modal": "true", "aria-label": "查看内容" },
            h("div", { className: "dap-head" },
              h("h2", { className: "dap-title" }, "查看内容 · " + (preview.title || preview.id)),
              h("button", { type: "button", className: "dap-close", "aria-label": "关闭", onClick: closePreview }, "×")
            ),
            h("div", { className: "dap-previewBody" },
              preview.loading
                ? h("p", { className: "dap-empty" }, "加载中…")
                : preview.error
                  ? h("p", { className: "dap-error" }, preview.error)
                  : (() => {
                      const data = preview.data || {};
                      const messages = Array.isArray(data.messages) ? data.messages : [];
                      const total = typeof data.totalMessages === "number" ? data.totalMessages : messages.length;
                      if (messages.length === 0) return h("p", { className: "dap-empty" }, "该会话没有可预览的对话内容。");
                      return h(React.Fragment, null,
                        total > messages.length
                          ? h("p", { className: "dap-rowMeta" }, "仅显示最近 " + messages.length + " / 共 " + total + " 条")
                          : null,
                        messages.map((msg, i) => h("div", { key: i, className: "dap-msgCard " + (msg.role === "user" ? "dap-msgUser" : "dap-msgAssistant") },
                          h("div", { className: "dap-msgRole" }, (msg.role === "user" ? "用户" : "助手") + (msg.time ? " · " + formatDate(msg.time) : "")),
                          h("div", { className: "dap-msgText" }, msg.content || "")
                        ))
                      );
                    })()
            )
          )
        ) : null;

        return ReactDOM.createPortal(
          h("div", {
            className: "dap-overlay",
            onClick: (event) => { if (event.target === event.currentTarget) props.onClose(); }
          },
            h("div", { className: "dap-modal", role: "dialog", "aria-modal": "true", "aria-label": "归档会话" },
              h("div", { className: "dap-head" },
                h("h2", { className: "dap-title" }, "归档会话"),
                h("button", { type: "button", className: "dap-close", "aria-label": "关闭", onClick: props.onClose }, "×")
              ),
              rows.length > 0
                ? h("div", { className: "dap-toolbar" },
                    h("span", { className: "dap-toolLabel" }, "排序"),
                    h("div", { className: "dap-chips" },
                      SORT_KEYS.map((key) => h("button", {
                        type: "button",
                        key: key,
                        className: "dap-chip" + (sortKey === key ? " dap-chipActive" : ""),
                        onClick: () => setSortKey(key)
                      }, SORT_LABELS[key]))
                    ),
                    h("button", {
                      type: "button",
                      className: "dap-dirBtn",
                      title: sortDir === "asc" ? "当前：正序（旧→新 / A→Z）" : "当前：倒序（新→旧 / Z→A）",
                      onClick: () => setSortDir((d) => (d === "asc" ? "desc" : "asc"))
                    }, sortDir === "asc" ? "正序 ↑" : "倒序 ↓")
                  )
                : null,
              archivedIds.length > 0
                ? h("div", { className: "dap-searchRow" },
                    h("input", {
                      type: "text",
                      className: "dap-searchInput",
                      placeholder: "搜索标题或工作区…",
                      value: query,
                      onChange: (e) => setQuery(e.target.value)
                    })
                  )
                : null,
              archivedIds.length > 0
                ? h("div", { className: "dap-filterRow" },
                    h("select", {
                      className: "dap-select",
                      value: selectedWs,
                      onChange: (e) => setSelectedWs(e.target.value)
                    },
                      h("option", { value: "ALL" }, "全部工作区"),
                      wsOptions.map((name) => h("option", { key: name, value: name }, name))
                    ),
                    h("div", { className: "dap-spacer" }),
                    h("button", {
                      type: "button",
                      className: "dap-btn dap-btnDanger",
                      disabled: busy === "all" || archivedIds.length === 0,
                      onClick: doDeleteAll
                    }, busy === "all" ? "删除中…" : "全部删除")
                  )
                : null,
              h("div", { className: "dap-body" },
                rows.length === 0
                  ? h("p", { className: "dap-empty" }, archivedIds.length === 0 ? "没有归档的会话。" : "没有匹配的归档会话。")
                  : rows.map((row) => h("div", { key: row.id, className: "dap-row" },
                      h("div", { className: "dap-rowMain" },
                        h("div", { className: "dap-rowTitle", title: row.id }, row.title),
                        h("div", { className: "dap-rowMeta" },
                          formatDate(row.createdAt) + " · " + row.turns + " 轮 · " + formatSize(row.dataSize) + (row.workspaceTitle ? " · " + row.workspaceTitle : "")
                        )
                      ),
                      h("div", { className: "dap-rowActions" },
                        h("button", { type: "button", className: "dap-btn", disabled: busy === row.id, onClick: () => openPreview(row.id, row.title) }, "查看内容"),
                        h("button", { type: "button", className: "dap-btn", disabled: busy === row.id, onClick: () => doRestore(row.id, false) }, busy === row.id ? "…" : "恢复"),
                        h("button", { type: "button", className: "dap-btn dap-btnPrimary", disabled: busy === row.id, onClick: () => doRestore(row.id, true) }, "恢复并打开"),
                        h("button", {
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
                ? h("p", { className: "dap-hint" }, "「删除」会永久清除会话日志与记录，且无法恢复。「全部删除」将清空所有归档会话。")
                : null,
              error !== null ? h("p", { className: "dap-error" }, error) : null,
              toast !== null ? h("p", { className: "dap-toast" }, toast) : null,
              previewNode
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
        return h(React.Fragment, null,
          h("button", {
            type: "button",
            className: "dap-trigger",
            "data-wide": wide ? "wide" : "rail",
            title: "归档会话",
            "aria-label": "归档会话",
            onClick: () => setOpen(true),
            children: [
              h(ArchiveIcon, { key: "icon" }),
              wide ? h("span", { key: "label", className: "dap-triggerLabel" }, "归档") : null,
              count > 0 ? h("span", { key: "badge", className: "dap-badge" }, count > 99 ? "99+" : String(count)) : null
            ]
          }),
          open ? h(ArchiveModal, { key: "modal", onClose: () => setOpen(false) }) : null
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
