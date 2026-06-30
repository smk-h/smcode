# smcode 第 1 章：交互式对话 Plan

## 架构概览

本章节实现一个基于终端的交互式对话应用，整体划分为五个模块：

- **CLI 入口**：解析命令行参数，确定配置文件路径，串联配置加载、Provider 创建与 TUI 渲染。
- **配置加载**：读取 YAML 配置文件并校验必要字段，将其映射为内部配置对象。
- **Provider 抽象**：定义统一对话接口，实现 OpenAI 兼容协议后端；接口设计预留扩展点，便于后续新增其他协议。
- **对话会话**：在内存中维护当前会话的消息历史，为每次模型调用提供完整上下文。
- **TUI 应用**：基于 smink 的 React 组件，负责对话展示、用户输入捕获、流式渲染与错误提示。

## 核心数据结构

### ChatMessage

表示发送给模型的一条消息。

```typescript
type ChatRole = 'system' | 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  content: string;
}
```

### ChatStreamChunk

Provider 流式返回的最小单元。本章支持 `content` 与 `thinking` 两种块类型，分别对应最终答案与思考过程。

```typescript
interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface ChatStreamChunk {
  type: 'content' | 'thinking' | 'usage';
  delta?: string;
  usage?: TokenUsage;
}
```

### ProviderConfig

YAML 配置在内存中的表示。

```typescript
interface ProviderConfig {
  protocol: 'openai';
  model: string;
  baseUrl: string;
  apiKey: string;
}
```

### Provider 接口

所有后端必须实现的统一接口。

```typescript
interface Provider {
  readonly protocol: string;
  stream(
    request: { messages: ChatMessage[] },
    signal?: AbortSignal,
  ): AsyncIterable<ChatStreamChunk>;
}
```

### ConversationMessage

TUI 内部维护的展示级消息，包含流式状态与思考内容。

```typescript
interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;
  streaming?: boolean;
}
```

## 模块设计

### CLI 入口（`src/index.ts`）

- **职责**：解析命令行参数（如 `--config`），调用配置加载器，使用工厂创建 Provider，渲染 TUI 应用。
- **对外接口**：`main(args: readonly string[]): number`
- **依赖**：`src/config/loader`、`src/provider/factory`、`src/tui/app`

### 配置加载（`src/config/loader.ts`）

- **职责**：按给定路径读取 YAML 文件，校验 `protocol`、`model`、`baseUrl`、`apiKey` 四个字段存在且合法，将 `base_url` / `api_key` 映射为驼峰命名。
- **对外接口**：`loadConfig(filePath: string): ProviderConfig`
- **依赖**：`js-yaml`、`node:fs`

### Provider 工厂（`src/provider/factory.ts`）

- **职责**：根据 `config.protocol` 的值创建对应的 Provider 实例；本章仅支持 `openai`，遇到其他协议时抛出清晰错误。
- **对外接口**：`createProvider(config: ProviderConfig): Provider`
- **依赖**：`OpenAIProvider`

### OpenAI Provider（`src/provider/openai.ts`）

- **职责**：使用 `openai` SDK 与 OpenAI 兼容后端通信，开启 `stream: true` 与 `stream_options: { include_usage: true }` 接收 SSE 流，将 `delta.content` 映射为 `content` 类型块，将 `delta.reasoning_content` 映射为 `thinking` 类型块，将最后一个 chunk 的 `usage` 映射为 `usage` 类型块。
- **实现**：`Provider` 接口
- **依赖**：`openai`

### 对话会话（`src/conversation/session.ts`）

- **职责**：按顺序维护用户与助手消息；支持追加用户消息、追加/更新助手消息、获取用于模型调用的历史消息列表。
- **对外接口**：
  - `addUserMessage(content: string): void`
  - `startAssistantResponse(): number`
  - `appendToAssistant(id: number, chunk: ChatStreamChunk): void`
  - `finalizeAssistant(id: number): void`
  - `getMessagesForModel(): ChatMessage[]`
- **依赖**：`ChatMessage`、`ChatStreamChunk` 类型

### TUI 应用（`src/tui/app.tsx`）

- **职责**：作为主 React 组件，维护 `messages`、`input` 与累计 `tokenUsage` 状态；通过 `useInput` 捕获键盘输入；在用户提交时调用 Provider 流并更新界面；将错误信息以消息形式展示；将 token 消耗传递给底部状态栏。
- **对外接口**：`App` 组件
- **依赖**：`smink`、`ConversationSession`、`createProvider` 结果

## 模块交互

1. CLI 入口解析参数，得到配置文件路径（默认 `.smcode/config.yaml`）。
2. CLI 入口调用 `loadConfig` 读取并校验配置。
3. CLI 入口调用 `createProvider(config)` 创建后端实例。
4. CLI 入口渲染 `<App provider={provider} config={config} />`。
5. TUI 内部创建 `ConversationSession` 实例维护历史。
6. 用户提交消息时：
   - `session.addUserMessage(content)` 写入用户消息。
   - `const id = session.startAssistantResponse()` 创建占位助手消息。
   - 调用 `provider.stream({ messages: session.getMessagesForModel() })`。
   - 遍历异步迭代器，对每个 `ChatStreamChunk`：
     - `content` / `thinking` 类型调用 `session.appendToAssistant(id, chunk)`。
     - `usage` 类型累加到 `tokenUsage` 状态。
   - 流结束后调用 `session.finalizeAssistant(id)`。
   - 期间任何错误作为一条 `assistant` 错误消息展示。

## 文件组织

```
smcode/
├── bin/
│   └── smcode.js              # 入口薄壳，转发到 out/index.js
├── src/
│   ├── index.ts               # CLI 入口与 main 函数
│   ├── config/
│   │   ├── loader.ts          # YAML 配置加载与校验
│   │   └── types.ts           # ProviderConfig 类型定义
│   ├── provider/
│   │   ├── types.ts           # Provider 接口与消息/流块类型
│   │   ├── factory.ts         # 根据 protocol 创建 Provider
│   │   └── openai.ts          # OpenAI 兼容 Provider 实现
│   ├── conversation/
│   │   ├── session.ts         # 会话历史管理
│   │   └── types.ts           # ConversationMessage 类型定义
│   └── tui/
│       ├── app.tsx            # smink 主应用组件
│       ├── components/
│       │   ├── MessageBubble.tsx  # 单条消息气泡（含思考折叠）
│       │   └── InputBar.tsx       # 底部输入框
│       └── theme.ts           # 颜色与样式常量
└── .smcode/
    └── config.yaml            # 默认配置文件示例
```

## 技术决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| TUI 框架 | `@smai-kit/smink` | 用户指定使用 smink；它基于 React，提供 `ScrollBox`、`useInput` 等能力，适合流式聊天场景。 |
| smink 引入方式 | 通过 npm 安装 `@smai-kit/smink` | 用户指定通过 npm 安装。 |
| HTTP 客户端 | `openai` 官方 SDK | 用于 OpenAI 兼容后端；SDK 已封装 SSE 流式解析、鉴权与错误处理，减少手写协议代码。 |
| Provider 抽象 | `AsyncIterable<ChatStreamChunk>` | 异步迭代接口对 TUI 友好，不同后端只需产生统一格式的块，调用方无需关心协议细节；`thinking` 块用于展示推理过程。 |
| 思考过程来源 | `delta.reasoning_content` | DeepSeek 等 OpenAI 兼容后端通过该字段返回推理内容，与最终答案分开展示。 |
| Token 消耗来源 | `chunk.usage` | 通过 `stream_options: { include_usage: true }` 请求，OpenAI 兼容后端在最后一个 chunk 中返回本次请求的 token 用量。 |
| YAML 解析 | `js-yaml` | Node 生态标准库，支持 YAML 1.2，与 TypeScript 配合良好。 |
| 配置来源 | YAML 文件 + CLI 参数 | 满足用户 YAML 配置要求；CLI 参数 `--config` 用于指定自定义配置文件路径。 |
| 历史持久化 | 内存（本章节） | spec 明确本章不做跨会话持久化，会话退出即释放。 |
| 系统提示 | 默认内置 + 可选配置扩展 | 保证首次运行有基本行为；后续可在 YAML 中增加 `system` 字段覆盖或扩展。 |

## 编码规范

**编程语言：** TypeScript

**适用的语言规范技能：** `ts-lang-spec`

开发阶段编写代码时，必须遵循 `ts-lang-spec` 中定义的编码风格、命名约定、注释规范等要求。开发执行者应在开始编码前自动调用该技能。
