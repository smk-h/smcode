# smcode TUI 界面优化 Plan

## 架构概览

本次界面优化在现有 `src/tui` 模块上进行分层重构，不改动 Provider、Conversation、Config 等底层逻辑。整体架构分为四层：

- **主题层**：扩展 `theme.ts`，引入 Claude Code 风格的珊瑚/橙色系配色、用户消息背景色、辅助色等。
- **组件层**：新增/重构展示组件，包括欢迎页、用户消息气泡、助手消息气泡、思考过程、处理中状态、底部输入框等。每个组件职责单一，仅接收 props 渲染。
- **应用层**：`app.tsx` 负责状态管理（消息历史、输入、加载、token、思考折叠状态）；**欢迎页常驻顶部**，消息区在其下方，不再根据消息是否为空切换视图。
- **入口层**：`index.tsx` 通过 `utils/terminal.ts` 手动写 DEC 1049 转义序列进/出终端备用屏幕（**不使用 smink `<AlternateScreen>` 组件**，原因见技术决策与 `claudecode-tui.md` 附录 C）；退出时离开备用屏幕（主屏恢复、对话不残留）并输出会话恢复提示。

## 核心数据结构

### `ConversationMessage`（已有，位于 `src/conversation/types.ts`）

```typescript
interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;
  streaming?: boolean;
}
```

本次复用该结构， thinking 字段用于存储思考过程文本。

### `ThinkingState`

```typescript
interface ThinkingState {
  /** 助手消息在消息列表中的索引 */
  messageIndex: number;
  /** 是否展开思考内容 */
  expanded: boolean;
}
```

用于记录每条助手消息的思考过程展开/折叠状态。

### `WelcomeContent`

```typescript
interface WelcomeContent {
  /** 入门提示列表 */
  tips: string[];
  /** 更新动态列表 */
  whatsNew: string[];
}
```

硬编码在常量文件中，供 `WelcomeScreen` 组件渲染。

### `StatusLineInfo`

```typescript
interface StatusLineInfo {
  /** 当前动作文本，如 "Cogitating…"；来自动词池随机选取或任务进行式覆盖 */
  verb: string;
  /** 已耗时（秒） */
  elapsedSeconds: number;
  /** 已接收 token 数（平滑追赶后的显示值） */
  tokenCount: number;
  /** 思考状态：'thinking' | 思考时长(ms) | null */
  thinkingStatus: 'thinking' | number | null;
  /** 卡顿强度 0~1；0 为正常，>0 时图标与文本向红色插值 */
  stalledIntensity: number;
}
```

用于渲染处理中动态提示行（F8–F8e）。完整机制依据见 `claudecode-tui.md`。

### `SpinnerFrames`（图标形态）

```typescript
/** 视觉权重递增的图标字符序列 */
const SPINNER_CHARACTERS = ['·', '✢', '✳', '✶', '✻', '✽'] as const;
/** 正序 + 反序 = 呼吸波形帧序列（12 帧） */
const SPINNER_FRAMES = [...SPINNER_CHARACTERS, ...[...SPINNER_CHARACTERS].reverse()];
```

终端无真正的像素缩放，借字符本身的视觉重量差异模拟"大小变化"。固定 `width={2}` 容器防止字符宽度差异引起抖动。

### `VerbPool`（动词）

```typescript
/** 进行式动词池；每轮随机选一个（sample），可被任务进行式覆盖 */
const SPINNER_VERBS = ['Thinking', 'Doing', 'Cogitating', 'Pondering', 'Brewing' /* … */] as const;
/** 完成式动词；轮次结束时配合 "for Xs" 展示 */
const TURN_COMPLETION_VERBS = ['Brewed', 'Cogitated', 'Cooked', 'Worked' /* … */] as const;
```

smcode 首版可精选少量花式动词 + 通用动词，后续按需扩充（Claude Code 池中有 180+ 个，见 `claudecode-tui.md` 第三节）。

## 模块设计

### `theme.ts`

**职责：** 定义 Claude Code 风格配色。
**新增/调整：**
- `primary`: 珊瑚色 `'#E57035'` 或 smink 支持的 chalk 颜色描述
- `welcomeBorder`: 欢迎页边框色
- `welcomeTipTitle`: 右侧标题色
- `userMessageBackground`: 用户消息气泡背景色
- `assistantBullet`: 助手消息圆点色
- `thinkingText`: 思考过程文本色
- `statusText`: 状态行文本色

### `WelcomeScreen.tsx`（常驻顶部欢迎主卡，圆角边框；布局对齐 LogoV2）

**职责：** 作为常驻顶部品牌区展示，不随对话消失，**保留圆角边框**。
**Props：**
```typescript
interface WelcomeScreenProps {
  version: string;
  modelName: string;
  providerName: string;
  cwd: string;
}
```
**实现要点：**
- 外层 `Box`：`borderStyle="round"` + `borderColor={theme.primary}` + `borderText`（`smcode` 品牌橙 + `v{version}` 灰，`top/start/offset:3`，用 `colorize`）。
- 内层 `Box flexDirection="row"` 分三栏：
  - **左列**（动态宽度，上限 50，`alignItems="center"`）：「Welcome back!」(inactive) → `<Clawd />` → `{model} · {provider}`（inactive dim）→ `{cwd}`（inactive dim）。
  - **竖线**：1 列 `Box`，`borderStyle="single"` + `borderColor={theme.primary}` + `borderDimColor` + 仅 `borderLeft`。
  - **右列**（`flexGrow={1}`）：两个 Feed 分区，标题 `theme.primary` bold、条目 `· ` 前缀 + `theme.dim`；上方「Tips for getting started」，下方「What's new」。

### `Clawd.tsx`（新增）

**职责：** 复刻 Claude Code 吉祥物（9×3 ASCII 方块小兽，`claudecode-tui.md` §B.3）。
**实现要点：**
- 三行结构：` ▐▛███▜▌` / `▝▜█████▛▘` / `  ▘▘ ▝▝`。
- 主体段用 `theme.primary`（clawd_body）+ 黑色背景 `theme.clawdBackground`（clawd_background）填充中间 5/5 列；两侧用 `theme.primary` 无背景。首版仅实现 `default` 姿态。
- `theme.ts` 需新增 `clawdBackground: 'rgb(0,0,0)'`。

### `UserMessage.tsx`

**职责：** 渲染用户消息气泡。
**Props：**
```typescript
interface UserMessageProps {
  content: string;
}
```
**实现要点：**
- 背景色使用 `userMessageBackground`。
- 左侧放置 `❯` 提示符（`USER_POINTER`，中性灰 `subtle`，**不染橙**），放入**固定 2 字符宽边沟**（`width={2}` 或字面量 `"❯ "`）。
- 外层 `Box flexDirection="row" alignItems="flex-start"`，内容区从第 2 列起；确保 `❯` 与助手 `●`、完成态 `✻` 落在同一垂直列（详见 `claudecode-tui.md` 附录 D）。
- 文本区域完整展示内容，支持换行。

### `AssistantMessage.tsx`

**职责：** 渲染助手消息。
**Props：**
```typescript
interface AssistantMessageProps {
  content: string;
  thinking?: string;
  expanded?: boolean;
  onToggleThinking?: () => void;
}
```
**实现要点：**
- 如果存在 thinking，**在 `●` 圆点行之前**独立渲染一行可折叠的思考指示器（`ThinkingIndicator`）；其前缀（展开态 `∴`、折叠态空格占位）顶格、与下方 `●` 圆点左对齐（同一列），思考行前不重复 `●` 圆点。
- `●` 圆点行：左侧放置 `●` 圆点标识（`ASSISTANT_BULLET`，亮前景 `text`，**不染橙**），放入**固定 2 字符宽边沟**（`minWidth={2}`，对标 Claude Code `<NoSelect minWidth={2}>`）；右侧 `Box flexDirection="column"` 渲染内容区。外层 `Box flexDirection="row" alignItems="flex-start"`。
- 内容区域做基础 Markdown 渲染：列表前加 `-`、代码块用反引号包裹并换行。
- **完成态行**（`✻ Brewed for Xs`）：轮次结束时由 `StatusIndicator` 切换为完成式渲染；`✻`（`COMPLETION_ASTERISK`，中性 dim 色）同样使用 2 字符固定边沟 + `flexDirection="row"` 行结构，确保与上方 `●`、`❯` 同列（与处理中脉冲星号线是两种状态，切换时图标列不变）。

### `ThinkingIndicator.tsx`

**职责：** 渲染思考过程的折叠/展开指示。
**Props：**
```typescript
interface ThinkingIndicatorProps {
  elapsedSeconds: number;
  expanded: boolean;
  thinking?: string;
  onToggle: () => void;
}
```
**实现要点：**
- 折叠状态显示 `Thinking for Xs (ctrl+o to expand)`，**不显示 `∴`**，以前缀空格占位（与展开态 `∴ ` 等宽），保证展开/折叠切换时文字位置不跳动。
- 展开状态以 `∴` 为前缀显示完整 thinking 文本，使用斜体/暗淡色。
- **顶格渲染、不缩进**，前缀（`∴` 或占位空格）与助手消息 `●` 圆点左对齐（同一列）；由调用方 `AssistantMessage` 将其放在 `●` 圆点行之前独立成行。
- 快捷键 ctrl+o 在 `app.tsx` 中通过 `useInput` 捕获并切换对应消息状态。

### `StatusIndicator.tsx`（含动态效果，依据 `claudecode-tui.md`）

**职责：** 在助手响应期间显示动态提示行（F8–F8e），**独占动画定时器**，避免消息列表与输入框跟随重渲染（对应 `claudecode-tui.md` 的"父子两层渲染"性能分层）。
**Props：**
```typescript
interface StatusIndicatorProps {
  verb: string;
  elapsedSeconds: number;
  tokenCount: number;
  thinkingStatus: 'thinking' | number | null;
  /** 是否有新内容流入，用于卡顿检测复位 */
  isStreaming: boolean;
  /** 终端列数，用于各段逐级降级 */
  columns: number;
}
```
**实现要点：**
- 内部用 `setInterval`（约 50–120ms）驱动一个 `tick`，所有随时间变化的量都在本组件内派生：
  - 图标帧 `frame = Math.floor(tick / 120)`，交给 `<SpinnerGlyph frame={frame} stalledIntensity={…} />`。
  - 卡顿强度 `stalledIntensity`：自上次 `isStreaming` 为真起计时，超过阈值（如 3s）开始线性增长至 1，恢复流入即归零（F8d）。
  - token 平滑计数：显示值按差距缓动追赶真实 `tokenCount`（差距小步长小，差距大步长大）。
- 渲染结构：`<SpinnerGlyph>` + 动词文本（颜色随 `stalledIntensity` 向红插值）+ 括号状态段（thinking / 耗时 / token，按 `columns` 逐级降级，优先级：动词 > thinking > 耗时 > token）。
- 放在消息列表底部、输入框上方。

### `SpinnerGlyph.tsx`（新增）

**职责：** 渲染呼吸脉冲的图标字符（F8a），并应用卡顿变红颜色（F8d）。
**Props：**
```typescript
interface SpinnerGlyphProps {
  frame: number;
  stalledIntensity: number;
}
```
**实现要点：**
- 从 `SPINNER_FRAMES` 按 `frame % SPINNER_FRAMES.length` 取字符，放进固定宽度 `Box width={2}`，避免不同字符宽度差异导致抖动。
- 颜色在主题主色与红色间按 `stalledIntensity` 线性插值；`stalledIntensity === 0` 时用主色。

### `InputBar.tsx`（重构）

**职责：** 底部输入框与快捷提示。
**Props：**
```typescript
interface InputBarProps {
  value: string;
  disabled: boolean;
  placeholder?: string;
  shortcutHint: string;
}
```
**实现要点：**
- 上下两条灰白边界线：`borderStyle="single"` + `borderColor={theme.dim}` + `borderTop` + `borderBottom` + `borderLeft={false}` + `borderRight={false}`。
- 左侧 `❯` 提示符。
- 下方左侧显示 `shortcutHint`，右侧显示状态文本。
- 移除现有的 token 用量展示（移至状态行或保留可选）。

### `app.tsx`（重构）

**职责：** 组合所有组件并管理状态。
**状态变更：**
- 新增 `thinkingExpanded` 数组/map，记录哪些助手消息的思考已展开。
- 新增 `elapsedSeconds` 状态，响应期间每秒自增。
- 新增 `statusVerb` 状态，根据当前阶段切换 "Thinking..." / "Doing..." / "Brewed..."。
- 监听 `ctrl+o`，切换当前最后一条助手消息的思考展开状态。
- 根据 `messages.length`（排除 system）决定是否渲染 `WelcomeScreen`。

### `utils/terminal.ts`（新增：终端控制原语）

**职责：** 封装备用屏幕进/出与会话恢复提示，对标 Claude Code `utils/gracefulShutdown.ts` 的退出编排（详见 `claudecode-tui.md` 附录 C）。
**导出：**
- `enterAltScreen()`：`writeSync(1, '\x1B[?1049h\x1B[2J\x1B[H')`——进入备用屏幕（应在 `render()` 之前调用）。
- `exitAltScreen()`：`writeSync(1, '\x1B[?1049l')` + `'\x1B[?25h'`——离开备用屏幕 + 显光标。
- `printResumeHint(sessionId)`：`writeSync(1, '\nResume this session with:\nsmcode --resume <id>\n')`——输出提示（须在 `exitAltScreen` 之后）。
**实现要点：** 用 `fs.writeSync`（同步写）而非 `process.stdout.write`/`console.log`，保证 `process.exit` 前刷盘。

### `index.tsx`（入口：流程编排）

**职责：** 调用 `utils/terminal.ts` 编排「进备用屏幕 → Provider 选择/主聊天 → 离备用屏幕 → 提示」。
**实现要点：**
- 生成会话 ID：`const sessionId = randomUUID()`（仅用于展示，暂未实现真正的 `--resume` 恢复）。
- 编排（退出顺序铁律）：`enterAltScreen()` → `try { selectProvider / render(<App/>) / await instance.waitUntilExit() } finally { exitAltScreen() }` → `printResumeHint(sessionId)`。
- 整个流程（Provider 选择 + 主聊天）共用同一个备用屏幕；`<ProviderSelector>` 与 `<App>` 均**不**再各自包裹 `<AlternateScreen>` 组件。
- `Ctrl+C` 仍由 `App`/`ProviderSelector` 内 `useInput → exit()` 触发 unmount，`waitUntilExit()` resolve 后走 `finally` 离开备用屏幕。

## 模块交互

```
启动流程：
  main() → render(<App />) → App 加载 Provider → 显示 WelcomeScreen

用户发送消息：
  useInput(Enter) → App.addUserMessage → 切换到聊天视图
                  → App.startAssistantResponse → 创建空助手消息
                  → 本轮动词随机选定（sample(SPINNER_VERBS)），整轮不变
                  → provider.stream → 逐块返回 thinking/content/usage
                  → App 更新消息内容、思考内容、token、thinkingStatus
                  → 每收到新内容即复位卡顿计时；StatusIndicator 内部 tick 驱动图标/颜色/计数动画
                  → 流结束 → verb 切换为完成式（如 Brewed for Xs）

快捷键：
  Ctrl+C → 退出
  Enter  → 发送消息（非加载状态）
  Ctrl+O → 切换最后一条助手消息的思考展开状态
```

## 文件组织

```
src/tui/
├── app.tsx                              # 主应用组件，状态管理
├── theme.ts                             # 主题配色
├── constants/
│   ├── figures.ts                       # 三个前缀图标常量（USER_POINTER/ASSISTANT_BULLET/COMPLETION_ASTERISK）
│   └── spinner.ts                       # 图标帧序列 + 动词池
└── components/
    ├── InputBar.tsx                     # 底部输入框（重构）
    ├── MessageBubble.tsx                # 可删除或改为兼容薄封装
    ├── ProviderSelector.tsx             # 保持原逻辑，主题色同步
    ├── WelcomeScreen.tsx                # 欢迎页
    ├── UserMessage.tsx                  # 用户消息气泡
    ├── AssistantMessage.tsx             # 助手消息
    ├── ThinkingIndicator.tsx            # 思考过程折叠/展开
    ├── StatusIndicator.tsx              # 处理中动态提示行（独占动画时钟）
    └── SpinnerGlyph.tsx                 # 图标字符呼吸脉冲 + 卡顿变红
src/utils/
└── terminal.ts                          # 备用屏幕进/出 + 会话恢复提示（对标 gracefulShutdown）
```

## 技术决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 终端渲染库 | 继续使用 `@smai-kit/smink` | 项目已基于 smink，替换成本高；smink 提供 Box/Text/useInput 等基础能力足够实现目标界面 |
| Markdown 渲染 | 自行实现基础格式化 | 不引入 `marked` 等依赖；本次需求只需列表、代码块基础样式 |
| 思考过程折叠 | 状态保存在 `app.tsx` | 简单场景下足够；后续若支持多轮独立折叠再下放到每条消息 |
| 欢迎页内容 | 硬编码常量 | 需求明确首次实现不做配置化/网络拉取，降低复杂度 |
| 用户消息气泡 | 背景色 + `❯` 提示符 | 与 Claude Code 截图一致，且 smink Box 支持 backgroundColor |
| 三个前缀图标对齐 | `❯`/`●`/`✻` 各放固定 2 字符边沟（`width`/`minWidth={2}`），行用 `flexDirection="row"` + `alignItems="flex-start"` | 字符渲染宽度异形，固定边沟把三者焊进同一列形成"装订线"；对标 Claude Code `<NoSelect minWidth={2}>` / `<Box minWidth={2}>`（`claudecode-tui.md` 附录 D） |
| 前缀图标颜色 | 三者中性灰/白（`subtle`/`text`/`dimColor`），不染橙 | 源码实证 Claude Code 的静态前缀本就是中性色；品牌橙留给处理中脉冲与欢迎页 |
| 计时器 | `setInterval` 每秒更新 | 简单直接；响应结束时清理 interval，避免内存泄漏 |
| 动态图标形态 | 星号字符序列正反序呼吸（`· ✢ ✳ ✶ ✻ ✽`） | 终端无真正缩放，借字符视觉权重差异模拟"大小变化"，零依赖、防抖好（依据 `claudecode-tui.md`） |
| 动词来源 | 花式动词池随机 + 任务进行式覆盖 + 完成式闭环 | 参考 Claude Code，兼顾趣味性与任务可读性 |
| 卡顿反馈 | 数秒无新内容则向红色线性插值 | 把"是否卡住"转为无需读数字即可感知的视觉信号（F8d） |
| 动画时钟归属 | 收敛进 `StatusIndicator` 子组件独占 | 避免消息列表/输入框跟随高频重渲染（`claudecode-tui.md` 性能分层） |
| 退出清屏 | 手动写 DEC 1049 转义序列（`utils/terminal.ts`），**不用** smink `<AlternateScreen>` 组件 | 对标 Claude Code（alt screen + `writeSync` + 退出顺序铁律）；组件版与欢迎页 `borderText+round` 边框存在时序竞争导致断裂，手动序列让 smink 在稳定备用屏幕渲染、消除竞争（`claudecode-tui.md` 附录 C） |
| 退出编排归属 | 收敛进 `utils/terminal.ts` | 对标 Claude Code `utils/gracefulShutdown.ts` 的职责分层：终端控制原语与入口流程编排分离 |

## 编码规范

**编程语言：** TypeScript（JSX）

**适用的语言规范技能：** `ts-lang-spec`

开发阶段编写代码时，必须遵循 `ts-lang-spec` 中定义的命名约定、注释规范、类型安全等要求。所有新增组件需使用函数组件 + `memo`（纯展示组件）或普通函数组件（含 hooks 的组件），props 必须显式定义接口。
