# dsh-plugin-everything-search

DSH 插件：通过 [voidtools Everything](https://www.voidtools.com/) 官方 SDK 做**全盘索引级文件名/文件夹即时搜索**（Windows）。

只依赖运行中的 Everything 进程 + 随插件打包的 SDK DLL，**不需要** HTTP 服务器，**不需要** es.exe。

## 工具

- \`everything_search\` — 即时搜索，返回完整路径、大小、修改时间。
- \`everything_status\` — 探测 SDK 是否加载、版本、数据库是否就绪。

## 安装

    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-plugin-everything-search

## 前提

- Windows，且 Everything 正在运行（托盘图标即可）。
- 无需任何额外配置。

## 配置

在 profile 的 cordis.patch.yml 覆盖 config：

    - id: everything-search
      config:
        enabled: true
        maxResults: 20
        sort: 1        # Everything SDK SortType，1 = 名称升序
        announceToAgent: true

## 搜索语法

\`everything_search\` 支持 Everything 原生搜索语法，例如：

- \`*.txt\`
- \`foo bar\`（空格 = AND）
- \`regex:^abc\`（配合 regex=true）

布尔参数对应 SDK 开关：match_case / match_whole_word / match_path / regex。

## 实现

宿主半边插件，通过 \`koffi\` FFI 加载随包附带的 Everything SDK DLL（Everything64.dll / Everything32.dll），调用 \`Everything_SetSearchW\` → \`Everything_QueryW\` → \`Everything_GetResult*\` 系列函数。SDK 与运行中的 Everything 进程通过 IPC 通信。

## 致谢

Everything SDK 版权归 voidtools（https://www.voidtools.com/）。SDK DLL 随包附带，遵循 Everything SDK 的使用条款。
