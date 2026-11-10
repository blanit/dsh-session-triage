# 会话收件箱 1.0.1：隔离 Web 验证记录

验证日期：2026-11-09，Asia/Hong_Kong。验证目标是复现并修复原插件的 Client 激活失败，未向日常 desktop profile 重新安装。

## 结论

原始 1.0.0 在隔离 Web 中稳定复现 `Failed to load plugins`。加入原始异常日志后，确认直接原因是重复声明已由原生工作区插件声明的子插槽。修复版本 1.0.1 在同一 Desktop 运行时下冷启动成功，现代侧栏可见，模式切换、会话收起和恢复、原生置顶菜单，以及卸载恢复均完成实际验证。

## 环境

| 项目 | 值 |
| --- | --- |
| 运行时 | Desktop 附带 DSH 0.2.2-rc.1 |
| CLI | Desktop 安装内 `resources/runtime/cli/bin/dsh.cmd` |
| DSH_HOME | 工作区 `.sandbox/web-lab-20261109/home` |
| profile | 独立 home 下的 `web` |
| 测试 workspace | `.sandbox/web-lab-20261109/workspace` |
| 最终监听地址 | http://127.0.0.1:12641/ |
| 被测插件 | @local/dsh-session-triage 1.0.1 |
| 最终服务任务 | pwsh-d36dcb23c1c94ef0，交付时继续运行 |

初始复现使用自动分配端口，后续固定 12641 以验证同一浏览器站点的偏好持久化。访问授权参数未写入本报告；新浏览器若需要授权，请使用本次私有服务日志中的完整启动地址。

## 根因与修改

诊断版本记录的原始异常：

```text
[session-triage] activation failed Error:
slot "sidebar.workspaces.session.row.action" is already declared
(by an entry in "sidebar.workspaces" (tk))
```

原生 `sidebar.workspaces` 条目已经拥有该子插槽。插件替换浏览区域时再次通过 `children` 声明同名插槽，注册阶段抛错；上层随后报告 `web boot: 1 entry did not activate`。这解释了此前 Desktop 崩溃日志中的插件激活失败，但本次没有重新触发 Electron 的崩溃处理。

修复涉及 [界面源码](<D:/WorkSpace/CodeProj/dsh-session-triage/src/view.js>)、生成的 [客户端构建](<D:/WorkSpace/CodeProj/dsh-session-triage/client.js>)、[包清单](<D:/WorkSpace/CodeProj/dsh-session-triage/package.json>) 和 [使用说明](<D:/WorkSpace/CodeProj/dsh-session-triage/README.md>)：

1. 移除重复的 `children` 声明，并停止在替换界面中跨所有者渲染原生行内子插槽。重命名、分叉、置顶和归档等操作仍通过原生会话菜单提供。
2. 修正侧栏注册优先级，从 `50` 调整为 `-50`。实际注册快照证明，原生优先级 `0` 在 `50` 之前被选中；调整后现代侧栏成为实际渲染项。
3. 保留激活和自身界面渲染的原始异常日志，便于以后诊断；删除临时注册清单输出。
4. 版本升为 1.0.1。

## 实际验证结果

| 验证项 | 结果与范围 |
| --- | --- |
| 原始版本复现 | 通过，隔离页面显示相同的插件激活失败 |
| 具体异常捕获 | 通过，重复声明插槽的原始堆栈已保存 |
| 修复后显示 | 通过，现代侧栏在真实 DSH 页面中可见 |
| 现代/传统模式切换 | 通过，恢复原生工作区树，再切回现代列表 |
| 刷新后的模式持久化 | 通过，选择传统模式后硬刷新仍保持传统模式 |
| 测试会话 | 在隔离实例发送一次最小请求，只要求回复“侧栏验证完成”，未要求执行工具；正常完成并显示在侧栏 |
| 手动收起 | 通过，会话从最近会话进入已收起分组 |
| 移回最近会话 | 通过，移回后在最近会话分组显示 |
| 原生会话菜单 | 通过，显示置顶、重命名、分叉、复制 ID、打开文件夹和归档入口 |
| 原生置顶/取消置顶 | 通过，分组随操作更新；已恢复为取消置顶 |
| 卸载及冷启动恢复 | 通过，移除插件后原生工作区树和测试会话正常显示，插件切换入口消失 |
| 重新安装 1.0.1 并冷启动 | 通过，现代侧栏和测试会话正常加载 |
| 构建与语法 | 通过，重新构建并检查生成的客户端 JavaScript |
| 状态模型测试 | 9/9 通过，覆盖审批优先级、运行子任务、归档边界、自动收起、稍后查看、主动唤醒和搜索过滤 |

最终测试会话保留在隔离环境中，已移回最近会话并取消置顶。未把测试配置、会话或代码安装到日常 profile。

## 证据

- [保留的原始包](<D:/WorkSpace/CodeProj/dsh-session-triage/.sandbox/web-lab-20261109/evidence/triage-20261109-0038/original-bundle/package.json>)：用于复现的 1.0.0 快照。
- [原始复现浏览器记录](<D:/WorkSpace/CodeProj/dsh-session-triage/.sandbox/web-lab-20261109/evidence/triage-20261109-0038/original-browser.json>)：包含基线、停止旧监听导致的连接重试及原始失败页面。连接重试不能算作插件自身异常。
- [根因诊断浏览器记录](<D:/WorkSpace/CodeProj/dsh-session-triage/.sandbox/web-lab-20261109/evidence/triage-20261109-0038/activation-diagnostic-browser.json>)：包含重复声明插槽的原始异常。
- [卸载输出](<D:/WorkSpace/CodeProj/dsh-session-triage/.sandbox/web-lab-20261109/evidence/triage-20261109-0038/uninstall-verification.log>)。
- [最终安装输出](<D:/WorkSpace/CodeProj/dsh-session-triage/.sandbox/web-lab-20261109/evidence/triage-20261109-0038/install-fixed-1.0.1.log>)。
- [最终冷启动页面快照](<D:/WorkSpace/CodeProj/dsh-session-triage/.sandbox/web-lab-20261109/evidence/triage-20261109-0038/fixed-1.0.1-page.json>)。
- [最终操作后页面快照](<D:/WorkSpace/CodeProj/dsh-session-triage/.sandbox/web-lab-20261109/evidence/triage-20261109-0038/fixed-1.0.1-final-page.json>)。

## 验证限制

- 本次是同版本运行时的 Web profile 验证，不是 Electron Desktop 端到端验证，也不代表已适合直接在日常 profile 启用。
- 9 项规则测试中的审批、计划审核、等待回答和运行子任务状态，未全部在真实模型会话中逐一触发。
- 本次界面观察使用深色桌面布局；未完整验证浅色、移动端、所有菜单动作、跨设备偏好或全部第三方行内扩展。
- 浏览器协作连接曾中断并失去会话。最终一次调试记录显示 `debugger_detached`，未覆盖完整流程，因此不以“空控制台记录”证明全程没有异常；冷启动后的页面快照、实际交互结果和截图可证明已验证的可见行为。
- 目前保留测试实例供用户查看。停止时应按已记录的任务和实际监听进程核对身份。此环境曾出现外层 PowerShell 任务取消后 CLI 子进程继续监听的情况，必须再确认端口释放，不能只看任务被取消。
