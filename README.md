# dsh-plugin-everything-search

DSH 插件：通过 [voidtools Everything](https://www.voidtools.com/) 做**全盘索引级文件名/文件夹即时搜索**（Windows）。

向模型注册两个工具：

- \`everything_search\` — 按文件名/路径即时搜索，返回路径、大小、修改时间。
- \`everything_status\` — 探测当前后端是否可用。

## 为什么是原生插件而不是 MCP

Everything 的查询是高频、低延迟、只读的，原生工具直接走宿主进程，省掉 MCP 的 JSON-RPC 往返与类型转换补丁，并且拥有强类型出参（\`output.schema\`）与可回放的结果。

## 后端

| backend | 说明 | 前提 |
| --- | --- | --- |
| \`http\`（默认） | Everything 内置 HTTP 服务器 | Everything → Tools → Options → HTTP Server 勾选 **Enable HTTP server** |
| \`es\` | 命令行 \`es.exe\` | 安装 [es.exe](https://www.voidtools.com/en-us/downloads/) 并配置 \`esPath\` |

## 安装

\`\`\`powershell
dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-plugin-everything-search
\`\`\`

## 配置

在 profile 的 \`cordis.patch.yml\` 中覆盖该 row 的 config：

\`\`\`yaml
- id: everything-search
  config:
    backend: http
    httpBaseUrl: http://127.0.0.1:47805
    esPath: es.exe
    timeoutMs: 5000
    maxResults: 10
    announceToAgent: true
\`\`\`

## 搜索语法

\`everything_search\` 会把布尔参数翻译成 Everything 修饰符前缀：

- \`match_case\` → \`case:\`
- \`match_whole_word\` → \`wholeword:\`
- \`regex\` → \`regex:\`
- \`match_path\` → \`path:\`

例如 \`query="foo"\` + \`match_case=true\` 会查询 \`case:foo\`。

## License

MIT
