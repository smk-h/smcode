# smcode 第 2 章：多 Provider 切换 Checklist

> 每一项通过运行代码或观察行为来验证，聚焦系统行为。

## 实现完整性

- [ ] **多 Provider 配置解析**（对应 AC1、AC2、AC5）：在 `.smcode/config.yaml` 中配置 `providers` 数组（至少两个合法 Provider），启动应用后观察到进入 Provider 选择界面，列表中正确显示每个 Provider 的 `name`、`protocol`、`model`。
- [ ] **旧格式向后兼容**（对应 AC1）：将 `.smcode/config.yaml` 改回第 1 章旧格式（顶层 `protocol`、`model`、`base_url`、`api_key`），启动应用后直接进入对话界面，可正常发送消息。
- [ ] **单 Provider 快速路径**（对应 AC4）：在 `.smcode/config.yaml` 中仅配置一个 Provider（`providers` 数组长度为 1），启动应用后跳过选择界面，直接进入对话界面。
- [ ] **新旧格式冲突处理**（对应 AC5）：在配置中同时写入旧格式字段和 `providers` 数组，启动后观察到使用 `providers` 数组中的 Provider，旧格式字段被忽略。
- [ ] **键盘选择交互**（对应 AC3）：在多 Provider 选择界面中，按 `↑` / `↓` 观察到高亮项移动；按 `Enter` 后进入对话界面，后续对话使用高亮项对应的 Provider。
- [ ] **选择界面退出**（对应 AC8）：在多 Provider 选择界面按 `Ctrl+C`，应用正常退出，终端无未处理异常或残留渲染。
- [ ] **配置错误提示**（对应 AC6）：
  - 将 `providers` 设为空数组，启动应用，观察到清晰的错误提示（如 `providers 数组不能为空`）。
  - 删除数组项中的 `name` 字段，启动应用，观察到提示具体字段缺失。
  - 删除 `providers` 且旧格式字段不完整，启动应用，观察到提示缺少 Provider 配置。
- [ ] **thinking 字段透传**（对应 AC9）：在 Provider 条目中设置 `thinking: true`，进入对话后使用会返回 `reasoning_content` 的模型提问，观察到思考过程被展示；未设置时默认不展示思考过程。
- [ ] **对话能力未退化**（对应 AC7）：完成 Provider 选择后，流式响应、思考过程展示、Token 消耗展示均与第 1 章一致。

## 集成

- [ ] **选择结果正确驱动 Provider 工厂**：在选择界面选中某一 Provider 后，通过临时日志或网络请求观察实际调用的 `baseURL`、`model` 与选中项一致。
- [ ] **对话模块不感知选择过程**：`src/tui/app.tsx` 和 `src/conversation/session.ts` 源码不直接引用 `ProviderSelector` 或 `resolveProviderSelection`。
- [ ] **单 Provider 路径不渲染选择组件**：使用单 Provider 配置启动时，`ProviderSelector` 组件不被实例化。
- [ ] **多 Provider 列表传递给选择组件**：使用多 Provider 配置启动时，`ProviderSelector` 接收到的 `providers` 长度与配置一致。
- [ ] **配置加载器统一输出**：无论旧格式还是新格式，`loadConfig` 返回的 `AppConfig` 都能被 `resolveProviderSelection` 正确解析。

## 编译与测试

- [ ] **项目编译无错误**：执行 `npm run build`，`out/` 目录生成所有新增/修改模块的 `.js` 与 `.d.ts`，终端无 TypeScript 类型错误。
- [ ] **类型检查通过**：执行 `npx tsc --noEmit`，返回退出码 0。
- [ ] **smink 单实例**：执行 `npm ls react`，确认只存在一个 react 版本，避免双实例导致的 Hook 错误。
- [ ] **代码符合 ts-lang-spec**：关键模块（`src/config/*`、`src/provider/*`、`src/tui/components/ProviderSelector.tsx`、`src/index.ts`）的命名、注释、类型导入符合 TypeScript 规范技能要求。

## 端到端场景

- [ ] **场景 1：多 Provider 启动并切换**：
  - 准备 `.smcode/config.yaml`，包含两个 Provider（如 `deepseek` 与 `ollama`）。
  - 启动 `npm start`。
  - 预期：进入选择界面，显示两个 Provider 的名称与模型。
  - 按 `↓` 选中第二个，按 `Enter`。
  - 预期：进入对话界面，输入 `你好`，观察回复来自第二个 Provider 对应的模型。

- [ ] **场景 2：单 Provider 快速启动**：
  - 准备 `.smcode/config.yaml`，`providers` 数组仅包含一个 Provider。
  - 启动 `npm start`。
  - 预期：直接进入对话界面，无选择界面停留。
  - 输入 `请用一句话打招呼`，观察到正常流式回复。

- [ ] **场景 3：旧配置文件无缝运行**：
  - 将 `.smcode/config.yaml` 改回第 1 章格式（无 `providers` 数组，仅有顶层字段）。
  - 启动 `npm start`。
  - 预期：直接进入对话界面，发送消息后模型正常回复，底部状态栏显示 token 消耗。

- [ ] **场景 4：选择后展示思考过程**：
  - 准备包含 `thinking: true` 的 DeepSeek Provider 的多 Provider 配置。
  - 启动并选择该 Provider。
  - 输入 `9.11 和 9.9 哪个更大？请逐步思考`。
  - 预期：界面先展示思考过程，再展示最终结论，底部状态栏显示 token 数量。

- [ ] **场景 5：配置错误优雅退出**：
  - 将 `.smcode/config.yaml` 中的 `providers` 设为空数组。
  - 启动 `npm start`。
  - 预期：终端显示清晰中文或英文错误提示，应用以非零退出码结束，不进入任何界面。
