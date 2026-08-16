# dsh-selfuse-plugins

在 dsh 上自用的各种插件仓库。

## 插件列表

- packages/dsh-everything-plugin — 通过 voidtools Everything SDK 做即时文件名/目录搜索（Windows），注册 everything_search 与 everything_status 工具。
- packages/dsh-cost-meter-cny — 实时 CNY 成本徽章（整会话 + 每回合），按北京时间峰谷双档计价，源自 DeepSeek 官方定价页。
- packages/dsh-selfuse-plugins-all — 聚合插件：一键安装并挂载本仓库全部插件。

## 安装

### 一键安装全部

    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-selfuse-plugins-all

### 单个安装（仍然可用）

    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-everything-plugin
    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-cost-meter-cny

安装后重启对应的 web profile 并刷新页面。

注意：聚合安装依赖 pnpm 解析 git 子目录传递依赖，需要在 profile 的 pnpm-workspace.yaml 里关闭 blockExoticSubdeps：

    blockExoticSubdeps: false

## 结构

这是一个 pnpm workspace monorepo：

    packages/
      dsh-everything-plugin/
      dsh-cost-meter-cny/
      dsh-selfuse-plugins-all/
