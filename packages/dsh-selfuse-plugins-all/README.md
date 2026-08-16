# dsh-selfuse-plugins-all

dsh-selfuse-plugins 仓库的聚合插件：一键安装并挂载该仓库下的全部插件。

## 聚合安装

    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-selfuse-plugins-all

## 单个安装（仍然可用）

    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-everything-plugin
    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-cost-meter-cny

## 当前聚合内容

- dsh-everything-plugin — Everything SDK 即时文件名/目录搜索
- dsh-cost-meter-cny — 峰谷双档 CNY 成本徽章
