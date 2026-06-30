# smcode 第 2 章：多 Provider 切换 Spec

## 背景

smcode 第 1 章已实现基于 YAML 配置的交互式对话能力，但配置层面仅支持单一 Provider：启动时直接读取顶层字段 `protocol`、`model`、`base_url`、`api_key` 并进入对话界面。随着使用场景扩展，用户通常需要在同一配置文件中维护多个模型供应商（例如本地 Ollama 与云端 DeepSeek 并行），并在启动时按需切换。

本章节聚焦第二个可交付里程碑：让 smcode 支持配置文件中的多 Provider 声明，并在启动时提供选择界面；用户选定某一 Provider 后，才进入第 1 章已实现的交互式对话界面。同时保持与第 1 章单 Provider 配置格式的向后兼容，避免已有配置文件失效。

## 目标

- 配置文件支持声明多个 Provider，每个 Provider 具有独立的名称、协议、模型、地址与认证信息。
- 启动应用时，系统根据配置中的 Provider 数量决定行为：
  - 仅有一个可用 Provider 时，直接进入对话界面。
  - 存在多个可用 Provider 时，先渲染 Provider 选择界面，等待用户选择后再进入对话界面。
- 选择界面基于 smink TUI 实现，支持键盘上下切换与回车确认。
- 选择结果作为当前激活 Provider 传递给对话界面，后续对话流程与第 1 章保持一致。
- 保留第 1 章单 Provider 配置格式作为兼容写法；当新旧格式同时存在时，以新格式 `providers` 数组为准。
- Provider 层新增 `thinking` 字段控制是否向模型请求或展示思考过程（配置透传，TUI 已具备展示能力）。

## 功能需求

- **F1 多 Provider 配置格式**：YAML 配置文件支持 `providers` 数组，数组项包含 `name`、`protocol`、`base_url`、`api_key`、`model`、`thinking` 字段；`name` 用于在选择界面区分不同 Provider。
- **F2 配置加载与解析**：配置加载器能够解析 `providers` 数组，也能解析第 1 章遗留的单 Provider 顶层字段；解析结果统一为内部 Provider 条目列表。
- **F3 单 Provider 快速进入**：当解析后的可用 Provider 恰好只有一个时，系统跳过选择界面，直接进入对话界面。
- **F4 多 Provider 选择界面**：当解析后的可用 Provider 多于一个时，系统渲染基于 smink 的选择界面，列出所有 Provider 的名称、协议与模型信息。
- **F5 键盘选择交互**：在选择界面中，用户可通过上/下方向键移动高亮项，按 Enter 确认选择；按 Ctrl+C 可退出应用。
- **F6 选择结果驱动对话**：用户确认选择后，系统使用选中的 Provider 条目创建 Provider 实例，并渲染对话 TUI；对话模块不感知选择过程，仅接收最终 Provider 实例。
- **F7 配置校验增强**：当 `providers` 数组存在但为空、或数组项缺少必要字段、或新旧格式都缺失时，系统给出清晰的错误提示。
- **F8 thinking 字段透传**：Provider 配置条目支持 `thinking` 布尔字段；该字段传递给 OpenAI Provider，用于控制是否请求/展示推理过程（具体协议行为由 Provider 实现决定）。

## 非功能需求

- **N1 向后兼容**：第 1 章的单 Provider 配置文件无需修改即可继续运行。
- **N2 最小侵入**：选择流程只在启动阶段介入，对话 TUI、会话管理、Provider 实现的核心逻辑不因此改动。
- **N3 可扩展性**：新增 Provider 协议时，只需扩展 Provider 工厂与配置校验，选择界面无需修改。
- **N4 错误可读性**：配置格式错误、Provider 条目缺失字段、选择界面异常等情况均给出中文或英文可理解提示。
- **N5 键盘可访问**：选择界面所有操作均可通过键盘完成，不依赖鼠标。
- **N6 技术栈一致**：继续使用 TypeScript / React / smink，与第 1 章构建流程和类型系统保持一致。

## 不做的事

- 本章不在应用运行过程中提供动态切换 Provider 的菜单；切换只能在启动时的选择界面完成。
- 本章不实现 Provider 分组、搜索、收藏排序等高级选择界面功能。
- 本章不实现 Provider 健康检查或连通性测试；选择界面仅展示静态配置信息。
- 本章不实现 Provider 配置的持久化记忆（例如记住上次选择）；每次启动都重新选择。
- 本章不修改 Provider 协议本身的抽象；仍只覆盖 OpenAI 兼容协议，后续协议扩展沿用第 1 章工厂模式。
- 本章不引入交互式配置编辑器或可视化配置向导。

## 验收标准

- **AC1** 在 `.smcode/config.yaml` 中使用第 1 章旧格式（单 Provider 顶层字段）启动应用，系统直接进入对话界面，行为与第 1 章一致（对应 N1、F2、F3）。
- **AC2** 在 `.smcode/config.yaml` 中配置两个及以上合法 Provider，启动应用后先进入 Provider 选择界面，列出所有 Provider 的名称与模型（对应 F1、F4）。
- **AC3** 在多 Provider 选择界面中，使用上下方向键可移动高亮项，按 Enter 后进入对话界面，且后续对话使用选中的 Provider（对应 F5、F6）。
- **AC4** 在 `.smcode/config.yaml` 中仅配置一个 Provider（`providers` 数组长度为 1），启动应用后跳过选择界面，直接进入对话界面（对应 F3）。
- **AC5** 配置文件同时存在旧格式字段和新格式 `providers` 数组时，系统以 `providers` 数组为准（对应 F2）。
- **AC6** 当 `providers` 数组为空、或数组项缺少 `name`/`protocol`/`base_url`/`model` 字段、或旧格式也缺失时，启动时输出清晰错误提示并退出（对应 F7、N4）。
- **AC7** 选择 Provider 后，对话界面的流式响应、思考过程展示、Token 消耗展示均与第 1 章相同（对应 F6）。
- **AC8** 选择界面按 Ctrl+C 可正常退出应用，不抛出未处理异常（对应 N4）。
- **AC9** 配置中 `thinking: true` 的 Provider 进入对话后，若后端返回推理内容，TUI 仍正确展示思考过程；`thinking` 字段缺失时默认按 `false` 处理（对应 F8）。
