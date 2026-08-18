# dsh-plugin-updater

DSH Web GUI 插件管理器：把「设置 > 插件」里的单一插件列表拆分为「内置插件列表」与「第三方插件列表」，并为手动安装的插件提供新版本检查与一键更新。

## 功能

- 「设置 > 插件」新增标签页 **第三方插件列表**：仅列出所有手动安装的插件。
- 原「插件列表」标签页替换为 **内置插件列表**：仅列出随 DSH 应用一起发布的原生插件。
- 每个插件卡片可展开查看：模块名、条目 ID、版本、来源、磁盘安装位置、运行状态。
- **检查更新**：npm 依赖查 npm registry 最新版；`github:` 依赖查仓库默认分支最新提交（已安装的 commit 从 profile 的 pnpm-lock.yaml 读取）。
- **逐项更新 / 全部更新**：后台执行 `pnpm update`（github 依赖重新解析到最新 commit，npm 依赖带 `--latest`）。
- **一键重启**：更新完成后提示重启，可在页面内重启服务器（脱离终端的 `dsh web` 进程，日志写入 `~/.dsh/logs/web-restart.log`），也可手动重启。

分类依据（host 端实时判定，不靠名字猜测）：插件模块实际解析到的磁盘路径——位于 dsh 应用安装目录内（`AppData\Roaming\npm\node_modules\@deepseek-ai\dsh`，profile 里对内置包是 junction，realpath 后落在应用目录）→ **内置**；其余（profile 的 node_modules、pnpm store、git/file/link 安装）→ **第三方**。模块无法解析时按 `@deepseek-ai/` 前缀兜底。

## 工作原理

双面插件（dual-face bundle）：

- **host 半**（`lib/index.js`），全部仅本机可访问（loopback-only）:
  - `GET /api/dsh-plugin-updater/catalog`：遍历 Cordis Loader 条目，输出带 `origin` / `version` / `packageDir` 的目录；
  - `GET /api/dsh-plugin-updater/updates`：对 profile 直接依赖里的第三方包做更新检查（结果缓存 5 分钟）；
  - `POST /api/dsh-plugin-updater/update`：以 `{ names: [...] }` 执行 pnpm update；
  - `POST /api/dsh-plugin-updater/restart`：脱离终端重启 dsh web 并退出当前进程。
- **浏览器半**（`lib/client.js`）：向 `settings.plugins.tab` 槽位注册 `builtin`（order 10）与 `third-party`（order 20）两个标签页，渲染目录并驱动上面的更新接口。

`cordis.patch.yml` 同时把官方自带的目录标签行 `ui-settings-plugin-inventory`（即原「插件列表」）disable 掉，由本插件的两个标签页接替；卸载本插件即自动恢复原标签。

## 注意事项

- 更新目标 = profile `dependencies` 里的第三方直接依赖；`link:` / `file:` 依赖与 `@deepseek-ai/*` 内置包不在其中（本插件自身是 `link:` 安装，改源码即生效）。
- 更新会改写 profile 的 `pnpm-lock.yaml` 与 `node_modules`，生效仍需重启（页面内的「重启服务器」按钮或手动重启）。
- 页面内重启会结束当前终端里的 dsh web 进程，并在后台拉起新的实例；若你启动时带自定义参数（如 `--port`），请手动重启以保留参数。
- 更新检查未使用 GitHub Token，受未认证 API 限流（60 次/小时），必要时可扩展支持 `GITHUB_TOKEN`。

## 安装

本地开发安装（改动即时生效，仍需重启 dsh web）：

    dsh plugin --profile web add "link:E:/Codes/AI Related/dsh-selfuse-plugins/packages/dsh-plugin-updater"

然后把 `dsh-plugin-updater` 追加到 `~/.dsh/profiles/web/package.json` 的 `dsh.profile.bundles` 末尾（补丁必须在 `@deepseek-ai/dsh-web-app` 之后应用才能禁用原标签行），最后重启：

    dsh web

发布后（如 GitHub）可改用与仓库内其他插件一致的依赖写法：

    "dsh-plugin-updater": "github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-plugin-updater"

## 跨平台

Windows 与 Linux 均可运行，相关代码按平台分支：

- 内置/第三方分类使用 `path.sep` 拼接前缀（Windows 反斜杠 / Linux 正斜杠），
  realpath 同样能穿透 Linux 上 pnpm 对内置包创建的符号链接；
- 页面内「重启服务器」在 Windows 用 `cmd /c ping -n 6` 延时拉起，
  在 Linux 用 `/bin/sh -c 'sleep 6'`；
- `pnpm` 可执行文件按平台选择（Windows 优先 `pnpm.cmd`，Linux 直接 `pnpm`）；
- profile 路径取自 `ctx.baseUrl` 或 `$DSH_HOME/profiles/web`（默认 `~/.dsh`），
  两端一致。

注意：本仓库里的 `dsh-everything-plugin` 依赖 Windows Everything SDK，
在 Linux 上它自身的工具调用会报错（与插件管理器无关）；其余各插件跨平台。

## 验证

    dsh --profile web --dump-config | grep -E "plugin-updater|ui-settings-plugin-inventory"

确认 `plugin-updater` 行已插入且 `ui-settings-plugin-inventory` 为 disabled；更新检查接口：

    curl http://127.0.0.1:3080/api/dsh-plugin-updater/updates

## 路线图

- [ ] 在第三方插件列表上直接启用/禁用插件（写 profile 的 cordis.patch.yml）
- [ ] 可选 GitHub Token 提升检查限流
