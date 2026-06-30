# smcode 第 2 章：多 Provider 切换 Plan

## 架构概览

本章节在保留第 1 章对话能力的前提下，在启动流程中插入一层「配置解析 → Provider 选择 → 对话启动」的编排。整体划分为六个模块：

- **CLI 入口**：解析命令行参数，调用配置加载器，根据 Provider 数量决定是直接启动对话还是先渲染选择界面。
- **配置加载**：读取 YAML 配置文件，同时支持第 1 章遗留的单 Provider 顶层字段与第 2 章新增的 `providers` 数组，统一映射为内部配置对象。
- **Provider 解析器**：根据配置对象计算「可用 Provider 列表」与「是否需要用户选择」，处理单 Provider 快速路径。
- **Provider 选择界面**：基于 smink 的 React 组件，展示 Provider 列表并捕获键盘选择事件。
- **Provider 工厂**：根据单个 Provider 条目的 `protocol` 创建对应后端实例；本章扩展为接收带 `name` 与 `thinking` 的 Provider 条目。
- **对话会话与 TUI**：复用第 1 章实现，仅接收最终确定的 Provider 实例，不感知选择过程。

## 核心数据结构

### ProviderItemConfig

表示一个具体可用的 Provider 条目，由配置加载器产生，供选择界面展示、供 Provider 工厂创建后端实例。

```typescript
interface ProviderItemConfig {
  /** Provider 显示名称，用于选择界面 */
  name: string;
  /** 后端协议标识 */
  protocol: 'openai';
  /** 模型名称 */
  model: string;
  /** API 基础地址 */
  baseUrl: string;
  /** API 认证密钥 */
  apiKey: string;
  /** 是否展示/请求思考过程 */
  thinking: boolean;
}
```

### AppConfig

YAML 配置在内存中的表示，兼容新旧两种格式。

```typescript
interface AppConfig {
  /** 新版多 Provider 列表 */
  providers?: ProviderItemConfig[];

  // 以下为第 1 章遗留字段，用于向后兼容
  /** 后端协议 */
  protocol?: 'openai';
  /** 模型名称 */
  model?: string;
  /** API 基础地址 */
  baseUrl?: string;
  /** API 认证密钥 */
  apiKey?: string;
  /** 是否展示/请求思考过程 */
  thinking?: boolean;
}
```

### ProviderSelectionResult

Provider 解析器的输出，描述当前应直接启动还是进入选择界面。

```typescript
interface ProviderSelectionResult {
  /** 可直接使用的单一 Provider，当 items 长度为 1 时存在 */
  selected?: ProviderItemConfig;
  /** 需要展示的 Provider 列表，当长度大于 1 时进入选择界面 */
  items: ProviderItemConfig[];
  /** 是否需要渲染选择界面 */
  needsSelection: boolean;
}
```

### ProviderSelectorProps

选择界面组件的属性。

```typescript
interface ProviderSelectorProps {
  /** 可供选择的 Provider 列表 */
  providers: readonly ProviderItemConfig[];
  /** 用户确认选择后的回调 */
  onSelect: (provider: ProviderItemConfig) => void;
  /** 用户取消选择（如 Ctrl+C）后的回调 */
  onCancel?: () => void;
}
```

## 模块设计

### CLI 入口（`src/index.ts`）

- **职责**：解析 `--config` 参数，加载配置，通过 Provider 解析器确定下一步；若需要选择则渲染 `ProviderSelector`，否则直接渲染 `App`。
- **对外接口**：`main(args: readonly string[]): Promise<number>`
- **依赖**：`src/config/loader`、`src/config/resolver`、`src/provider/factory`、`src/tui/ProviderSelector`、`src/tui/app`

### 配置加载（`src/config/loader.ts`）

- **职责**：按给定路径读取 YAML 文件，解析为 `AppConfig`；校验整体结构合法（至少存在一个可用 Provider 的来源）；将 `base_url` / `api_key` 映射为驼峰命名。
- **对外接口**：`loadConfig(filePath: string): AppConfig`
- **依赖**：`js-yaml`、`node:fs`、`src/config/types`

### Provider 解析器（`src/config/resolver.ts`）

- **职责**：接收 `AppConfig`，统一提取 Provider 条目列表；当 `providers` 数组存在时优先使用；当仅有一个条目时直接返回选中；当多个条目时返回需要选择。
- **对外接口**：`resolveProviderSelection(config: AppConfig): ProviderSelectionResult`
- **依赖**：`src/config/types`

### Provider 工厂（`src/provider/factory.ts`）

- **职责**：根据 `ProviderItemConfig.protocol` 创建对应 Provider 实例；本章仍只支持 `openai`。
- **对外接口**：`createProvider(config: ProviderItemConfig): Provider`
- **依赖**：`OpenAIProvider`、`src/provider/types`

### OpenAI Provider（`src/provider/openai.ts`）

- **职责**：使用 `openai` SDK 与兼容后端通信；构造函数接收 `ProviderItemConfig`；根据 `config.thinking` 决定是否向模型传递与推理相关的参数（例如 `stream_options` 或特定模型参数）。
- **实现**：`Provider` 接口
- **依赖**：`openai`、`src/config/types`

### Provider 选择界面（`src/tui/components/ProviderSelector.tsx`）

- **职责**：基于 smink 渲染 Provider 列表，显示名称、协议、模型；支持上下箭头高亮、Enter 确认、Ctrl+C 退出。
- **对外接口**：`ProviderSelector` 组件
- **依赖**：`@smai-kit/smink`、`src/config/types`、`src/tui/theme`

### 对话 TUI（`src/tui/app.tsx`）

- **职责**：复用第 1 章实现，接收已确定的 Provider 实例，启动交互式对话。
- **对外接口**：`App` 组件
- **依赖**：`Provider`、`ConversationSession` 等

## 模块交互

1. CLI 入口解析参数，得到配置文件路径（默认 `.smcode/config.yaml`）。
2. CLI 入口调用 `loadConfig` 读取 YAML，返回 `AppConfig`。
3. CLI 入口调用 `resolveProviderSelection(config)`，得到 `ProviderSelectionResult`：
   - 若 `needsSelection` 为 `false`，直接使用 `result.selected` 创建 Provider。
   - 若 `needsSelection` 为 `true`，渲染 `<ProviderSelector providers={result.items} onSelect={...} />`。
4. 用户在选择界面确认后，回调函数使用选中的 `ProviderItemConfig` 调用 `createProvider`。
5. 得到 Provider 实例后，渲染 `<App provider={provider} />`。
6. 后续对话流程与第 1 章完全一致。

## 文件组织

```
smcode/
├── bin/
│   └── smcode.js              # 入口薄壳（不变）
├── src/
│   ├── index.ts               # CLI 入口：参数解析、配置加载、选择/对话分支
│   ├── config/
│   │   ├── types.ts           # AppConfig、ProviderItemConfig、ProviderSelectionResult
│   │   ├── loader.ts          # YAML 配置加载与基础校验
│   │   └── resolver.ts        # 多 Provider 解析与选择判定
│   ├── provider/
│   │   ├── types.ts           # Provider 接口与消息/流块类型（不变）
│   │   ├── factory.ts         # 接收 ProviderItemConfig 创建 Provider
│   │   └── openai.ts          # 构造函数改为接收 ProviderItemConfig
│   ├── conversation/          # 第 1 章实现（不变）
│   ├── tui/
│   │   ├── app.tsx            # 对话主应用（不变）
│   │   ├── components/
│   │   │   ├── ProviderSelector.tsx  # 新增：Provider 选择界面
│   │   │   ├── MessageBubble.tsx     # 单条消息气泡（不变）
│   │   │   └── InputBar.tsx          # 底部输入框（不变）
│   │   └── theme.ts           # 颜色与样式常量（不变）
│   └── ...
└── .smcode/
    ├── config.yaml            # 更新为示例多 Provider 配置
    └── config.example.yaml    # 示例配置（同步更新）
```

## 技术决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 新旧配置格式 | 同时支持 `providers` 数组与第 1 章顶层字段 | 避免已有配置文件失效，降低用户迁移成本；新格式优先。 |
| 配置冲突策略 | `providers` 数组存在时完全忽略旧格式字段 | 语义清晰，避免用户误以为旧字段也会生效。 |
| Provider 选择结果传递 | 选择界面通过 `onSelect` 回调向上传递 | 符合 React 单向数据流，便于在 CLI 入口统一决定下一步渲染。 |
| 选择界面退出 | 支持 `Ctrl+C` 调用 `useApp().exit()` | 与对话界面退出方式保持一致。 |
| `thinking` 字段默认值 | `false` | 大多数模型不需要显式请求思考过程，保持默认关闭可减少意外行为。 |
| OpenAI Provider 构造函数入参 | 改为 `ProviderItemConfig` | 让 Provider 实现能够读取 `name` 与 `thinking` 等配置项，同时与工厂接口保持一致。 |
| 选择界面高亮样式 | 使用反色或加粗边框标识当前选中项 | smink 支持 inverse / bold 等文本属性，无需引入额外依赖。 |
| 是否需要持久化上次选择 | 不做 | 本章聚焦启动选择，持久化属于后续增强功能。 |
| 单 Provider 是否强制选择 | 不强制，直接跳过 | 减少无意义交互，保持启动路径最短。 |

## 编码规范

**编程语言：** TypeScript

**适用的语言规范技能：** `ts-lang-spec`

开发阶段编写代码时，必须遵循 `ts-lang-spec` 中定义的编码风格、命名约定、注释规范等要求。开发执行者应在开始编码前自动调用该技能。
