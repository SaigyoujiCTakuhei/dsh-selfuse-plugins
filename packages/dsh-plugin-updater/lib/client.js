window.__ModuleLoader__.load({
  id: "dsh-plugin-updater",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let React = require("react");

    var NS = "settings.pluginUpdater";
    var CATALOG_URL = "/api/dsh-plugin-updater/catalog";
    var UPDATES_URL = "/api/dsh-plugin-updater/updates";
    var UPDATE_URL = "/api/dsh-plugin-updater/update";
    var RESTART_URL = "/api/dsh-plugin-updater/restart";

    var zh = {
      builtinTab: "内置插件列表",
      thirdPartyTab: "第三方插件列表",
      loading: "正在读取插件…",
      error: "暂时无法读取插件。",
      retry: "重试",
      search: "搜索插件",
      catalogBuiltin: "内置插件（随 DSH 一起发布）",
      catalogThirdParty: "第三方插件（手动安装）",
      empty: "暂无插件。",
      emptySearch: "没有匹配的插件。",
      enabledTag: "已启用",
      disabledTag: "已禁用",
      phaseUnobserved: "未运行",
      phasePending: "等待中",
      phaseLoading: "加载中",
      phaseActive: "运行中",
      phaseFailed: "失败",
      phaseUnloading: "卸载中",
      detailModule: "模块名",
      detailEntry: "条目 ID",
      detailVersion: "版本",
      detailOrigin: "来源",
      detailPath: "安装位置",
      originBuiltin: "内置",
      originThirdParty: "第三方",
      checkUpdates: "检查更新",
      checkingUpdates: "检查更新中…",
      checkUpdatesFailed: "检查更新失败。",
      updatesFound: "发现 {count} 个可更新插件",
      updateAll: "全部更新",
      update: "更新",
      updating: "更新中…",
      updatedRestart: "已更新，重启后生效",
      restartServer: "重启服务器",
      restarting: "正在重启，稍后刷新页面…",
      restartHint: "或在终端手动重启：dsh web",
      updateFailed: "更新失败",
      builtinHint: "内置插件随 DSH 应用更新（npm update -g @deepseek-ai/dsh）。"
    };

    var en = {
      builtinTab: "Built-in plugins",
      thirdPartyTab: "Third-party plugins",
      loading: "Reading plugins…",
      error: "Plugins cannot be read right now.",
      retry: "Retry",
      search: "Search plugins",
      catalogBuiltin: "Built-in plugins (shipped with DSH)",
      catalogThirdParty: "Third-party plugins (installed manually)",
      empty: "No plugins.",
      emptySearch: "No matching plugins.",
      enabledTag: "Enabled",
      disabledTag: "Disabled",
      phaseUnobserved: "Not running",
      phasePending: "Pending",
      phaseLoading: "Loading",
      phaseActive: "Active",
      phaseFailed: "Failed",
      phaseUnloading: "Unloading",
      detailModule: "Module",
      detailEntry: "Entry ID",
      detailVersion: "Version",
      detailOrigin: "Origin",
      detailPath: "Install location",
      originBuiltin: "Built-in",
      originThirdParty: "Third-party",
      checkUpdates: "Check updates",
      checkingUpdates: "Checking updates…",
      checkUpdatesFailed: "Update check failed.",
      updatesFound: "{count} update(s) available",
      updateAll: "Update all",
      update: "Update",
      updating: "Updating…",
      updatedRestart: "Updated — restart to apply",
      restartServer: "Restart server",
      restarting: "Restarting, refresh in a moment…",
      restartHint: "Or restart manually: dsh web",
      updateFailed: "Update failed",
      builtinHint: "Built-in plugins update with the DSH app (npm update -g @deepseek-ai/dsh)."
    };

    var CSS = ".dpu-section{width:100%;max-width:760px;color:var(--dsw-alias-label-primary,#111418);display:flex;flex-direction:column;gap:14px}" +
      ".dpu-status,.dpu-failure p{margin:0}.dpu-status,.dpu-failure{color:var(--dsw-alias-label-tertiary,#767a80);font-size:13px;line-height:20px}" +
      ".dpu-failure{color:var(--dsw-alias-state-error-primary,#e5484d);display:flex;align-items:center;gap:10px}" +
      ".dpu-failure button{border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1));color:var(--dsw-alias-label-primary,#111418);font:inherit;cursor:pointer;background:0 0;border-radius:6px;padding:4px 10px}" +
      ".dpu-catalog{display:flex;flex-direction:column;gap:12px}" +
      ".dpu-search{width:100%;color:var(--dsw-alias-label-tertiary,#767a80);display:flex;align-items:center;position:relative}" +
      ".dpu-search>svg{pointer-events:none;position:absolute;left:12px}" +
      ".dpu-search input{border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1));background:var(--dsw-alias-bg-layer-1,#fff);width:100%;height:36px;color:var(--dsw-alias-label-primary,#111418);font:inherit;border-radius:8px;outline:none;padding:0 34px 0 36px;font-size:13px}" +
      ".dpu-search input::placeholder{color:var(--dsw-alias-label-tertiary,#767a80)}" +
      ".dpu-search input:focus-visible{border-color:var(--dsw-alias-state-business-primary,#4176e6);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary,#4176e6) 18%,transparent)}" +
      ".dpu-heading{display:flex;align-items:baseline;gap:7px;padding:0 2px}.dpu-heading h3{margin:0;font-size:13px;font-weight:600;line-height:20px}" +
      ".dpu-heading span{color:var(--dsw-alias-label-tertiary,#767a80);font-variant-numeric:tabular-nums;font-size:12px;line-height:18px}" +
      ".dpu-actions{margin-left:auto;display:flex;align-items:center;gap:6px}" +
      ".dpu-btn{border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1));background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#111418);font:inherit;font-size:12px;line-height:18px;border-radius:6px;padding:2px 10px;cursor:pointer}" +
      ".dpu-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}" +
      ".dpu-btn:disabled{opacity:.55;cursor:default}" +
      ".dpu-btnPrimary{border-color:var(--dsw-static-deepseek-500,#4176e6);background:var(--dsw-static-deepseek-500,#4176e6);color:#fff}" +
      ".dpu-btnPrimary:hover{background:var(--dsw-static-deepseek-600,#2f5fd0)}" +
      ".dpu-btnDanger{border-color:var(--dsw-alias-state-error-primary,#e5484d);color:var(--dsw-alias-state-error-primary,#e5484d)}" +
      ".dpu-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:10px;margin:0;padding:0;list-style:none}" +
      ".dpu-card{border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.08));background:var(--dsw-alias-bg-layer-3,#fff);border-radius:10px;min-width:0;overflow:hidden}" +
      ".dpu-card[data-open=true]{border-color:var(--dsw-alias-border-l1,rgba(0,0,0,.15));box-shadow:var(--dsw-shadow-lv1,0 4px 16px rgba(0,0,0,.08))}" +
      ".dpu-cardContent{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;padding:10px 12px}" +
      ".dpu-cardTitle{margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:600;line-height:20px}" +
      ".dpu-cardTrailing{display:flex;align-items:center;gap:6px;flex:none}" +
      ".dpu-statusDot{width:8px;height:8px;border-radius:50%;flex:none}" +
      ".dpu-statusDot[data-phase=active]{background:var(--dsw-alias-state-success-primary,#1f9d55)}" +
      ".dpu-statusDot[data-phase=loading],.dpu-statusDot[data-phase=pending],.dpu-statusDot[data-phase=unloading]{background:var(--dsw-alias-state-warning-primary,#d97706)}" +
      ".dpu-statusDot[data-phase=failed]{background:var(--dsw-alias-state-error-primary,#e5484d)}" +
      ".dpu-statusDot[data-phase=unobserved]{background:var(--dsw-alias-label-tertiary,#9aa0a6)}" +
      ".dpu-tag{border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1));border-radius:6px;padding:1px 6px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary,#5b5f66);flex:none}" +
      ".dpu-tag[data-enabled=true]{color:var(--dsw-alias-state-success-primary,#1f9d55);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary,#1f9d55) 40%,transparent)}" +
      ".dpu-tag[data-enabled=false]{color:var(--dsw-alias-label-tertiary,#767a80)}" +
      ".dpu-chevron{color:var(--dsw-alias-label-tertiary,#767a80);flex:none;transition:transform .12s ease}" +
      ".dpu-card[data-open=true] .dpu-chevron{transform:rotate(180deg)}" +
      ".dpu-details{border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));padding:10px 12px;display:flex;flex-direction:column;gap:6px}" +
      ".dpu-dl{margin:0;display:grid;grid-template-columns:max-content 1fr;gap:4px 12px;font-size:12px;line-height:18px}" +
      ".dpu-dl dt{color:var(--dsw-alias-label-tertiary,#767a80);white-space:nowrap}" +
      ".dpu-dl dd{margin:0;min-width:0;overflow-wrap:anywhere}" +
      ".dpu-dl code,.dpu-entry{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px}" +
      ".dpu-dl code{background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.04));border-radius:4px;padding:1px 5px}" +
      ".dpu-updateRow{display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06));padding:6px 12px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary,#5b5f66)}" +
      ".dpu-updateRow code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px}" +
      ".dpu-updateText{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".dpu-banner{display:flex;align-items:center;gap:10px;border:1px solid color-mix(in srgb,var(--dsw-static-deepseek-500,#4176e6) 45%,transparent);background:color-mix(in srgb,var(--dsw-static-deepseek-500,#4176e6) 8%,transparent);border-radius:10px;padding:10px 12px;font-size:13px;line-height:20px}" +
      ".dpu-bannerMain{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}" +
      ".dpu-bannerTitle{margin:0;font-weight:600}" +
      ".dpu-bannerHint{margin:0;color:var(--dsw-alias-label-tertiary,#767a80);font-size:12px;line-height:18px}" +
      ".dpu-errorLine{margin:0;color:var(--dsw-alias-state-error-primary,#e5484d);font-size:12px;line-height:18px}";

    var CSS_TAG_ID = "dsh-plugin-updater/style.css";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(CSS_TAG_ID) + "]") === null) {
      var tag = document.createElement("style");
      tag.dataset.plugin = "dsh-plugin-updater";
      tag.dataset.pluginCss = CSS_TAG_ID;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    // --- helpers -------------------------------------------------------------

    function SearchIcon() {
      return React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true" },
        React.createElement("path", {
          d: "M7.25 1.75a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Zm-7 5.5a7 7 0 1 1 12.6 4.28l3.19 3.19-1.06 1.06-3.19-3.19A7 7 0 0 1 .25 7.25Z",
          fill: "currentColor"
        })
      );
    }

    function ChevronIcon() {
      return React.createElement("svg", { width: 12, height: 12, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true" },
        React.createElement("path", {
          d: "M3.47 5.53 8 10.06l4.53-4.53 1.06 1.06L8 12.19 2.41 6.59l1.06-1.06Z",
          fill: "currentColor"
        })
      );
    }

    var PHASE_KEYS = {
      "pending": "phasePending",
      "loading": "phaseLoading",
      "active": "phaseActive",
      "failed": "phaseFailed",
      "unloading": "phaseUnloading"
    };

    function phaseLabel(phase, t) {
      if (phase === null || phase === undefined) return t("phaseUnobserved");
      return t(PHASE_KEYS[String(phase)] || "phaseUnobserved");
    }

    /** Compact a module specifier without guessing whether its Loader id was generated. */
    function moduleShortName(moduleName) {
      return (moduleName.indexOf("@") === 0 ? moduleName.slice(moduleName.indexOf("/") + 1) : moduleName)
        .replace(/^cordis:/, "")
        .replace(/^cordis-plugin-/, "")
        .replace(/^dsh-(?:host-|client-)?/, "");
    }

    function postJson(url, body) {
      return fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(body)
      }).then(function (response) { return response.json(); });
    }

    // --- tab component ---------------------------------------------------------

    function PluginListTab(props) {
      var t = props.t;
      var origin = props.origin;
      var isThirdParty = origin === "third-party";

      var requestState = React.useState(0);
      var request = requestState[0];
      var setRequest = requestState[1];
      var queryState = React.useState("");
      var query = queryState[0];
      var setQuery = queryState[1];
      var expandedState = React.useState(null);
      var expanded = expandedState[0];
      var setExpanded = expandedState[1];
      var dataState = React.useState({ status: "loading" });
      var data = dataState[0];
      var setData = dataState[1];
      var updState = React.useState({ status: "loading" });
      var upd = updState[0];
      var setUpd = updState[1];
      var updRequestState = React.useState(0);
      var updRequest = updRequestState[0];
      var setUpdRequest = updRequestState[1];
      var busyNamesState = React.useState([]);
      var busyNames = busyNamesState[0];
      var setBusyNames = busyNamesState[1];
      var updatedNamesState = React.useState([]);
      var updatedNames = updatedNamesState[0];
      var setUpdatedNames = updatedNamesState[1];
      var restartingState = React.useState(false);
      var restarting = restartingState[0];
      var setRestarting = restartingState[1];
      var actionErrorState = React.useState(null);
      var actionError = actionErrorState[0];
      var setActionError = actionErrorState[1];

      React.useEffect(function () {
        var current = true;
        fetch(CATALOG_URL, { headers: { accept: "application/json" } }).then(function (response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        }).then(function (snapshot) {
          if (current && snapshot && snapshot.ok) setData({ status: "ready", snapshot: snapshot });
        }, function () {
          if (current) setData({ status: "error" });
        });
        return function () { current = false; };
      }, [request]);

      React.useEffect(function () {
        if (!isThirdParty) return;
        var current = true;
        setUpd({ status: "loading" });
        fetch(UPDATES_URL, { headers: { accept: "application/json" } }).then(function (response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        }).then(function (snapshot) {
          if (current && snapshot && snapshot.ok) setUpd({ status: "ready", data: snapshot });
        }, function () {
          if (current) setUpd({ status: "error" });
        });
        return function () { current = false; };
      }, [updRequest, isThirdParty]);

      var normalizedQuery = query.trim().toLocaleLowerCase();
      var entries = data.status === "ready" ? (data.snapshot.entries || []).filter(function (entry) {
        return entry.origin === origin;
      }) : [];

      var filtered = React.useMemo(function () {
        return entries.filter(function (entry) {
          if (normalizedQuery.length === 0) return true;
          return ((entry.moduleName || "") + " " + (entry.entryId || "")).toLocaleLowerCase().indexOf(normalizedQuery) !== -1;
        });
      }, [data, normalizedQuery, origin]);

      React.useEffect(function () {
        if (expanded !== null && !filtered.some(function (entry) { return entry.entryId === expanded; })) setExpanded(null);
      }, [expanded, filtered]);

      var targets = upd.status === "ready" && upd.data && Array.isArray(upd.data.targets) ? upd.data.targets : [];
      var targetByName = {};
      for (var i = 0; i < targets.length; i++) targetByName[targets[i].name] = targets[i];
      var updatable = targets.filter(function (target) { return target.hasUpdate; });
      var restartPending = upd.status === "ready" && upd.data && upd.data.restartPending === true;

      var retry = function () {
        setData({ status: "loading" });
        setRequest(function (value) { return value + 1; });
      };
      var retryUpdates = function () {
        setUpd({ status: "loading" });
        setUpdRequest(function (value) { return value + 1; });
      };

      var doUpdate = function (names) {
        if (names.length === 0) return;
        setActionError(null);
        setBusyNames(names);
        postJson(UPDATE_URL, { names: names }).then(function (result) {
          if (!result || result.ok !== true) {
            setActionError((result && result.error) ? result.error : t("updateFailed"));
            return;
          }
          setUpdatedNames(function (current) {
            var next = current.slice();
            for (var k = 0; k < (result.updated || []).length; k++) {
              if (next.indexOf(result.updated[k]) === -1) next.push(result.updated[k]);
            }
            return next;
          });
          setRequest(function (value) { return value + 1; });
          retryUpdates();
        }, function (reason) {
          setActionError(reason && reason.message ? reason.message : String(reason));
        }).then(function () {
          setBusyNames([]);
        });
      };

      var doRestart = function () {
        setRestarting(true);
        setActionError(null);
        fetch(RESTART_URL, { method: "POST" }).catch(function () {});
      };

      var heading = origin === "builtin" ? t("catalogBuiltin") : t("catalogThirdParty");
      var children = [];

      if (data.status === "loading") {
        children.push(React.createElement("p", { key: "loading", className: "dpu-status" }, t("loading")));
      }
      if (data.status === "error") {
        children.push(React.createElement("div", { key: "error", className: "dpu-failure" },
          React.createElement("p", { role: "alert" }, t("error")),
          React.createElement("button", { type: "button", onClick: retry }, t("retry"))
        ));
      }
      if (data.status === "ready") {
        var catalogChildren = [];
        if (origin === "builtin") {
          catalogChildren.push(React.createElement("p", { key: "builtinHint", className: "dpu-status" }, t("builtinHint")));
        }
        if (restartPending) {
          catalogChildren.push(React.createElement("div", { key: "restartBanner", className: "dpu-banner", role: "status" },
            React.createElement("div", { className: "dpu-bannerMain" },
              React.createElement("p", { className: "dpu-bannerTitle" }, t("updatedRestart")),
              React.createElement("p", { className: "dpu-bannerHint" }, t("restartHint"))
            ),
            React.createElement("button", {
              type: "button",
              className: "dpu-btn dpu-btnPrimary",
              disabled: restarting,
              onClick: doRestart
            }, restarting ? t("restarting") : t("restartServer"))
          ));
        }
        if (actionError !== null) {
          catalogChildren.push(React.createElement("p", { key: "actionError", className: "dpu-errorLine", role: "alert" }, actionError));
        }
        catalogChildren.push(React.createElement("label", { key: "search", className: "dpu-search" },
          React.createElement(SearchIcon, null),
          React.createElement("input", {
            type: "search",
            value: query,
            placeholder: t("search"),
            "aria-label": t("search"),
            onChange: function (event) { setQuery(event.currentTarget.value); }
          })
        ));
        catalogChildren.push(React.createElement("div", { key: "heading", className: "dpu-heading" },
          React.createElement("h3", null, heading),
          React.createElement("span", { "data-plugin-count": filtered.length }, filtered.length),
          isThirdParty
            ? React.createElement("span", { className: "dpu-actions" },
                upd.status === "loading"
                  ? React.createElement("span", { className: "dpu-tag" }, t("checkingUpdates"))
                  : null,
                upd.status === "error"
                  ? React.createElement("button", { type: "button", className: "dpu-btn", onClick: retryUpdates }, t("checkUpdatesFailed"))
                  : null,
                React.createElement("button", { type: "button", className: "dpu-btn", onClick: retryUpdates }, t("checkUpdates")),
                updatable.length > 0
                  ? React.createElement("button", {
                      type: "button",
                      className: "dpu-btn dpu-btnPrimary",
                      disabled: busyNames.length > 0,
                      onClick: function () { doUpdate(updatable.map(function (target) { return target.name; })); }
                    }, t("updateAll") + " (" + updatable.length + ")")
                  : null
              )
            : null
        ));
        catalogChildren.push(entries.length === 0
          ? React.createElement("p", { key: "empty", className: "dpu-status" }, t("empty"))
          : null);
        catalogChildren.push(entries.length > 0 && filtered.length === 0
          ? React.createElement("p", { key: "emptySearch", className: "dpu-status" }, t("emptySearch"))
          : null);
        if (filtered.length > 0) {
          catalogChildren.push(React.createElement("ul", { key: "cards", className: "dpu-cards" },
            filtered.map(function (entry) {
              var title = moduleShortName(entry.moduleName || "");
              var status = phaseLabel(entry.fiberPhase, t);
              var configText = t(entry.enabled ? "enabledTag" : "disabledTag");
              var open = expanded === entry.entryId;
              var target = targetByName[entry.moduleName] || null;
              var isBusy = busyNames.indexOf(entry.moduleName) !== -1;
              var justUpdated = updatedNames.indexOf(entry.moduleName) !== -1 && (!target || !target.hasUpdate);
              var cardChildren = [
                React.createElement("button", {
                  key: "content",
                  type: "button",
                  className: "dpu-cardContent",
                  "aria-expanded": open,
                  onClick: function () { setExpanded(function (current) { return current === entry.entryId ? null : entry.entryId; }); },
                  children: [
                    React.createElement("strong", { className: "dpu-cardTitle", title: entry.moduleName }, title),
                    React.createElement("span", { className: "dpu-cardTrailing" },
                      entry.enabled
                        ? React.createElement("span", {
                            className: "dpu-statusDot",
                            "data-phase": entry.fiberPhase === null || entry.fiberPhase === undefined ? "unobserved" : entry.fiberPhase,
                            role: "img",
                            "aria-label": status,
                            title: status
                          })
                        : null,
                      React.createElement("span", { className: "dpu-tag", "data-enabled": entry.enabled ? "true" : "false" }, configText),
                      React.createElement("span", { className: "dpu-chevron" }, React.createElement(ChevronIcon, null))
                    )
                  ]
                })
              ];
              if (isThirdParty && target && (target.hasUpdate || justUpdated)) {
                cardChildren.push(React.createElement("div", { key: "updateRow", className: "dpu-updateRow" },
                  React.createElement("span", {
                    className: "dpu-updateText",
                    title: target.latestDetail || ""
                  }, justUpdated
                    ? t("updatedRestart")
                    : React.createElement("code", null, (target.installedShort || "?") + " → " + (target.latestShort || "?"))),
                  justUpdated
                    ? null
                    : React.createElement("button", {
                        type: "button",
                        className: "dpu-btn dpu-btnPrimary",
                        disabled: isBusy,
                        onClick: function () { doUpdate([entry.moduleName]); }
                      }, isBusy ? t("updating") : t("update"))
                ));
              }
              if (isThirdParty && target && target.error && !justUpdated) {
                cardChildren.push(React.createElement("div", { key: "updateErr", className: "dpu-updateRow" },
                  React.createElement("span", { className: "dpu-updateText" }, target.error)
                ));
              }
              if (open) {
                cardChildren.push(React.createElement("div", { key: "details", className: "dpu-details" },
                  React.createElement("dl", { className: "dpu-dl" },
                    React.createElement("dt", null, t("detailModule")),
                    React.createElement("dd", null, React.createElement("code", { className: "dpu-entry" }, entry.moduleName)),
                    React.createElement("dt", null, t("detailEntry")),
                    React.createElement("dd", null, React.createElement("code", { className: "dpu-entry" }, entry.entryId)),
                    React.createElement("dt", null, t("detailVersion")),
                    React.createElement("dd", null, entry.version === null || entry.version === undefined ? "—" : entry.version),
                    React.createElement("dt", null, t("detailOrigin")),
                    React.createElement("dd", null, entry.origin === "builtin" ? t("originBuiltin") : t("originThirdParty")),
                    entry.packageDir ? React.createElement("dt", null, t("detailPath")) : null,
                    entry.packageDir ? React.createElement("dd", null, React.createElement("code", { className: "dpu-entry" }, entry.packageDir)) : null
                  )
                ));
              }
              return React.createElement("li", {
                key: entry.entryId,
                className: "dpu-card",
                "data-plugin-entry": entry.entryId,
                "data-open": open ? "true" : undefined,
                children: cardChildren
              });
            })
          ));
        }
        children.push(React.createElement("div", { key: "catalog", className: "dpu-catalog" }, catalogChildren));
      }

      return React.createElement("div", { className: "dpu-section", "aria-busy": data.status === "loading" }, children);
    }

    // --- entry -----------------------------------------------------------------

    var inject = ["slots", "locale"];

    function apply(ctx) {
      ctx.effect(function () {
        return ctx.locale.register(NS, { zh: zh, en: en });
      }, "dsh-plugin-updater: dictionaries");
      var t = ctx.locale.bind(NS);
      ctx.slots.inject("settings.plugins.tab", function* () {
        yield ctx.slots.register({
          name: "settings.plugins.tab",
          id: "builtin",
          order: 10,
          label: function () { return t("builtinTab"); },
          locale: NS,
          inject: function () { return { origin: "builtin" }; }
        }, PluginListTab);
        yield ctx.slots.register({
          name: "settings.plugins.tab",
          id: "third-party",
          order: 20,
          label: function () { return t("thirdPartyTab"); },
          locale: NS,
          inject: function () { return { origin: "third-party" }; }
        }, PluginListTab);
      });
    }

    exports.NS = NS;
    exports.PluginListTab = PluginListTab;
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
