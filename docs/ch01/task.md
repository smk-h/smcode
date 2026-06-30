# smcode 第 1 章：交互式对话 Tasks

## 文件清单

| 操作 | 文件 | 职责 |
|------|------|------|
| 新建 | `src/provider/types.ts` | Provider 接口与消息/流块类型 |
| 新建 | `src/config/types.ts` | ProviderConfig 类型定义 |
| 新建 | `src/config/loader.ts` | YAML 配置加载与校验 |
| 新建 | `src/provider/openai.ts` | OpenAI 兼容 Provider 实现 |
| 新建 | `src/provider/factory.ts` | 根据 protocol 创建 Provider |
| 新建 | `src/conversation/types.ts` | ConversationMessage 类型定义 |
| 新建 | `src/conversation/session.ts` | 会话历史管理 |
| 新建 | `src/tui/theme.ts` | 颜色与样式常量 |
| 新建 | `src/tui/components/MessageBubble.tsx` | 单条消息气泡（含思考折叠） |
| 新建 | `src/tui/components/InputBar.tsx` | 底部输入框与状态提示 |
| 新建 | `src/tui/app.tsx` | smink 主应用组件 |
| 修改 | `src/index.ts` | CLI 入口：参数解析、配置加载、渲染 TUI |
| 修改 | `package.json` | 添加运行时依赖 |
| 新建 | `.smcode/config.yaml` | 默认配置文件示例 |

## T1: 安装运行时依赖

**文件：** `package.json`
**依赖：** 无
**步骤：**
1. 在项目根目录执行 `npm install @smai-kit/smink react`。
2. 执行 `npm install openai js-yaml`。
3. 执行 `npm install --save-dev @types/js-yaml @types/react`。

**验证：**
- `npm ls react` 只输出一个 react 实例。
- `node -e "import('@smai-kit/smink').then(m => console.log(typeof m.render))"` 输出 `function`。
- `npm run build` 仍然成功（当前源码未引用新依赖时不报错）。

## T2: 定义 Provider 核心类型

**文件：** `src/provider/types.ts`
**依赖：** 无
**步骤：**
1. 定义 `ChatRole` 联合类型：`'system' | 'user' | 'assistant'`。
2. 定义 `ChatMessage` 接口，包含 `role` 和 `content`。
3. 定义 `TokenUsage` 接口，包含 `promptTokens`、`completionTokens`、`totalTokens`。
4. 定义 `ChatStreamChunk` 接口，包含 `type: 'content' | 'thinking' | 'usage'`、`delta?: string`、`usage?: TokenUsage`。
5. 定义 `Provider` 接口，包含 `protocol: string` 属性和 `stream(request, signal?): AsyncIterable<ChatStreamChunk>` 方法。

**验证：** `npm run build` 成功（该文件无外部依赖，应能编译）。

## T3: 定义配置类型与加载器

**文件：** `src/config/types.ts`、`src/config/loader.ts`
**依赖：** 无
**步骤：**
1. 在 `src/config/types.ts` 定义 `ProviderConfig` 接口，字段为 `protocol`（固定 `'openai'`）、`model`、`baseUrl`、`apiKey`。
2. 在 `src/config/loader.ts` 实现 `loadConfig(filePath: string): ProviderConfig`：
   - 使用 `node:fs.readFileSync` 读取 YAML 文件。
   - 使用 `js-yaml.load` 解析。
   - 校验四个字段均存在且非空。
   - 将 `base_url` / `api_key` 映射为 `baseUrl` / `apiKey`。
   - 遇到错误时抛出带有文件路径的清晰错误。

**验证：** 写一个临时脚本调用 `loadConfig('.smcode/config.yaml')`（使用 T12 创建的示例配置），断言返回对象字段正确；缺失字段时断言抛出错误。

## T4: 实现 OpenAI Provider

**文件：** `src/provider/openai.ts`
**依赖：** T2
**步骤：**
1. 导入 `OpenAI` 与 `Provider`、`ChatMessage`、`ChatStreamChunk` 类型。
2. 实现 `OpenAIProvider` 类，构造函数接收 `config: ProviderConfig`。
3. 在 `stream` 方法中调用 `openai.chat.completions.create({ model, messages, stream: true, stream_options: { include_usage: true } })`。
4. 使用 `for await` 遍历流：
   - 若 `delta.reasoning_content` 存在，产出 `type: 'thinking'` 的块。
   - 若 `delta.content` 存在，产出 `type: 'content'` 的块。
   - 若 `chunk.usage` 存在，产出 `type: 'usage'` 的块。

**验证：** `npm run build` 成功。

## T5: 实现 Provider 工厂

**文件：** `src/provider/factory.ts`
**依赖：** T2、T4
**步骤：**
1. 导入 `OpenAIProvider` 和 `ProviderConfig`。
2. 实现 `createProvider(config: ProviderConfig): Provider`。
3. 当 `config.protocol === 'openai'` 返回 `OpenAIProvider` 实例。
4. 其他协议抛出 `Unsupported protocol: xxx` 错误。

**验证：** 写一个临时脚本用 `openai` 配置调用 `createProvider`，断言返回实例的 `protocol` 属性为 `openai`；用不支持的 protocol 调用时断言抛出错误。

## T6: 实现对话会话管理

**文件：** `src/conversation/types.ts`、`src/conversation/session.ts`
**依赖：** T2
**步骤：**
1. 在 `src/conversation/types.ts` 定义 `ConversationMessage` 接口，包含 `role`、`content`、`thinking?`、`streaming?`。
2. 在 `src/conversation/session.ts` 实现 `ConversationSession` 类：
   - `addUserMessage(content)` 追加用户消息。
   - `startAssistantResponse()` 创建一条 `streaming: true` 的空助手消息，返回消息 ID。
   - `appendToAssistant(id, chunk)` 根据 `chunk.type` 追加 `content` 或 `thinking`。
   - `finalizeAssistant(id)` 将 `streaming` 置为 `false`。
   - `getMessagesForModel()` 返回 `ChatMessage[]` 列表（仅含 role/content，不含 thinking）。

**验证：** 写临时脚本构造 session，执行添加用户消息、开始助手回复、追加 thinking 和 content、结束回复，断言 `getMessagesForModel()` 返回正确历史且不含 thinking。

## T7: 定义 TUI 主题

**文件：** `src/tui/theme.ts`
**依赖：** 无
**步骤：**
1. 定义颜色常量对象，至少包含：用户消息色、助手消息色、思考过程色、边框色、主色调、错误色、暗淡提示色。
2. 使用 smink 支持的 `ansi:` 或 `ansi256()` 颜色格式。

**验证：** `npm run build` 成功。

## T8: 实现消息气泡组件

**文件：** `src/tui/components/MessageBubble.tsx`
**依赖：** T7
**步骤：**
1. 接收 `msg: ConversationMessage` 属性。
2. 区分用户与助手消息，显示不同标签与颜色。
3. 当 `msg.thinking` 存在时，在正文前展示思考过程（使用 theme 中的思考色）。
4. 当 `msg.streaming` 为 true 且内容为空时显示等待占位符。

**验证：** `npm run build` 成功。

## T9: 实现底部输入框组件

**文件：** `src/tui/components/InputBar.tsx`
**依赖：** T7
**步骤：**
1. 接收 `value`、`disabled`、`placeholder`、`tokenUsage` 等属性。
2. 使用 `Box` 渲染带边框的输入区，左侧显示提示符 `❯`。
3. 显示当前输入文本和光标占位符 `▎`。
4. 在底部状态栏左侧显示累计 token 消耗（格式如 `prompt: 12  completion: 34  total: 46`），右侧显示发送提示或等待提示。

**验证：** `npm run build` 成功。

## T10: 实现 TUI 主应用

**文件：** `src/tui/app.tsx`
**依赖：** T1、T6、T8、T9
**步骤：**
1. 定义 `App` 组件属性：`provider: Provider`。
2. 使用 `useState` 维护 `messages`、`input`、`loading`、`tokenUsage` 状态；`tokenUsage` 初始值为 `{ promptTokens: 0, completionTokens: 0, totalTokens: 0 }`。
3. 在组件内创建 `ConversationSession` 实例（用 `useRef` 或 `useState` 保持引用稳定）。
4. 使用 `useInput` 处理键盘：
   - `Ctrl+C` 调用 `useApp().exit()` 退出。
   - `Enter` 提交输入。
   - `Backspace/Delete` 删除字符。
   - 普通字符追加到 `input`。
5. 提交时：
   - `session.addUserMessage(input)`。
   - `const id = session.startAssistantResponse()`。
   - 设置 `loading` 为 true。
   - 调用 `provider.stream({ messages: session.getMessagesForModel() })`。
   - 遍历流：
     - `content` / `thinking` 类型更新 `messages` 状态。
     - `usage` 类型累加到 `tokenUsage` 状态。
   - 流结束或出错时设置 `loading` 为 false；出错时以助手消息展示错误。
6. 渲染布局：顶部标题栏、中间 `ScrollBox` 消息区、底部 `InputBar`，并将 `tokenUsage` 传入 `InputBar`。

**验证：** `npm run build` 成功。

## T11: 更新 CLI 入口

**文件：** `src/index.ts`
**依赖：** T3、T5、T10
**步骤：**
1. 解析命令行参数，支持 `--config <path>`，默认值为 `.smcode/config.yaml`。
2. 调用 `loadConfig(configPath)` 读取配置。
3. 调用 `createProvider(config)` 创建 Provider。
4. 调用 `render(<App provider={provider} />)` 启动 TUI。
5. 在 TUI 外部捕获配置加载或 Provider 创建错误，以文本形式打印到 stderr 并返回非零退出码。

**验证：**
- `npm run build` 成功。
- 不带配置运行 `node bin/smcode.js`，若 `.smcode/config.yaml` 缺失应看到清晰错误提示。
- 配置正确时进入 TUI 界面（后续 checklist 进一步验证对话行为）。

## T12: 添加默认配置示例

**文件：** `.smcode/config.yaml`
**依赖：** 无
**步骤：**
1. 在项目根目录创建 `.smcode/` 目录。
2. 在 `.smcode/` 目录下创建 `config.yaml`。
3. 填写示例配置，包含注释说明四个字段含义，默认 `protocol: openai`。

**验证：** T3 的 `loadConfig` 测试能够成功读取并解析 `.smcode/config.yaml`。

## T13: 验证完整构建与启动

**文件：** `package.json`、`bin/smcode.js`
**依赖：** T1-T12
**步骤：**
1. 执行 `npm run build` 编译整个项目。
2. 确认 `out/` 目录包含所有新增模块的 `.js` 与 `.d.ts`。
3. 确认 `bin/smcode.js` 仍指向 `out/index.js`。
4. 执行 `npm start` 验证启动流程（无有效 API key 时应进入 TUI 并在发送消息后显示错误）。

**验证：** `npm run build` 无错误，`npm start` 能进入 TUI 界面。

## 执行顺序

```
T1
│
├──→ T2  ──→ T4  ──→ T5  ──┐
│                           │
├──→ T3  ───────────────────┤
│                           │
├──→ T6  ───────────────────┤
│                           │
├──→ T7  ──→ T8  ──→ T10 ──┤
│         └──→ T9  ─────────┘
│
├──→ T12
│
└──→ T11  ──→ T13
```
