# smcode TUI 界面优化 Tasks

## 文件清单

| 操作 | 文件 | 职责 |
|------|------|------|
| 修改 | `src/tui/theme.ts` | 扩展 Claude Code 风格配色 |
| 新建 | `src/tui/components/WelcomeScreen.tsx` | 欢迎页主卡（对齐 LogoV2） |
| 新建 | `src/tui/components/Clawd.tsx` | Clawd 吉祥物（9×3 ASCII） |
| 新建 | `src/tui/components/UserMessage.tsx` | 用户消息气泡 |
| 新建 | `src/tui/components/ThinkingIndicator.tsx` | 思考过程折叠/展开指示 |
| 新建 | `src/tui/components/AssistantMessage.tsx` | 助手消息（含思考） |
| 新建 | `src/tui/components/SpinnerGlyph.tsx` | 图标字符脉冲 + 卡顿变红 |
| 新建 | `src/tui/components/StatusIndicator.tsx` | 处理中动态提示行 |
| 新建 | `src/tui/constants/figures.ts` | 三个前缀图标常量（`❯`/`●`/`✻`） |
| 新建 | `src/tui/constants/spinner.ts` | 图标帧序列 + 动词池常量 |
| 修改 | `src/tui/components/InputBar.tsx` | 底部输入框样式重构 |
| 删除 | `src/tui/components/MessageBubble.tsx` | 被 UserMessage/AssistantMessage 替代 |
| 修改 | `src/tui/app.tsx` | 状态管理与组件组合 |

## T1: 扩展 theme.ts 配色

**文件：** `src/tui/theme.ts`
**依赖：** 无
**步骤：**
1. 保留现有颜色键，新增 Claude Code 风格所需键：
   - `welcomeBorder`
   - `welcomeTipTitle`
   - `userMessageBackground`
   - `assistantBullet`
   - `statusText`
2. 将 `primary` 调整为珊瑚/橙色系（如 `'#E57035'` 或 smink 支持的 chalk 描述）。
3. 保持 `thinking` 颜色可用于思考文本。

**验证：** 文件保存后，`npm run build` 到 T10 再统一跑；此处人工确认键名无拼写错误。

## T2: 创建欢迎页（Clawd + WelcomeScreen）

依据 `claudecode-tui.md` 附录 B，对齐 Claude Code LogoV2 主卡。拆为两步，按 T2a → T2b 顺序。

### T2a: 创建 Clawd 吉祥物

**文件：** `src/tui/components/Clawd.tsx`、`src/tui/theme.ts`
**依赖：** T1
**步骤：**
1. `theme.ts` 新增 `clawdBackground: 'rgb(0,0,0)'`。
2. 定义 `Clawd` 组件（无 props，首版仅 default 姿态）：三行结构 ` ▐▛███▜▌` / `▝▜█████▛▘` / `  ▘▘ ▝▝`；用嵌套 `<Text>`，主体中段 `color={theme.primary}` + `backgroundColor={theme.clawdBackground}`，两侧 `color={theme.primary}` 无背景。
3. 导出。

**验证：** `npm run build` 通过；临时渲染确认 9 列 × 3 行形态。

### T2b: 创建 WelcomeScreen（常驻顶部欢迎主卡，圆角边框）

**文件：** `src/tui/components/WelcomeScreen.tsx`
**依赖：** T1、T2a
**步骤：**
1. 定义 `WelcomeScreenProps`：`{ version, modelName, providerName, cwd }`。
2. 硬编码 `tips` / `whatsNew` 数组。
3. 外层 `Box`：`borderStyle="round"` + `borderColor={theme.primary}` + `borderText`（`colorize` 拼 `smcode` 品牌橙 + `v{version}` 灰，`top/start/offset:3`）。
4. 内层三栏 `Box flexDirection="row"`：
   - 左列（动态宽，`alignItems="center"`）：「Welcome back!」(inactive) → `<Clawd />` → `{model} · {provider}`(inactive dim) → `{cwd}`(inactive dim)。
   - 竖线：1 列 `Box`，`borderStyle="single"` + `borderColor={theme.primary}` + `borderDimColor` + 仅 `borderLeft`。
   - 右列（`flexGrow={1}`）：两个 Feed（Tips for getting started / What's new），标题 `theme.primary` bold、条目 `· ` + `theme.dim`。
5. 导出。

**验证：** `npm start` 启动后，顶部常驻显示圆角边框欢迎卡（borderText 标题 + Clawd + 信息 + 双 Feed）；发送消息后欢迎卡仍在顶部；欢迎卡之外无第二层边框。

## T3: 创建 UserMessage 组件

**文件：** `src/tui/components/UserMessage.tsx`、`src/tui/constants/figures.ts`
**依赖：** T1
**步骤：**
1. 新建 `src/tui/constants/figures.ts`，集中定义三个前缀图标常量（对标 Claude Code `figures.ts`）：
   - `USER_POINTER = '❯'`（`figures.pointer`，U+276F）
   - `ASSISTANT_BULLET = '●'`（`BLACK_CIRCLE`，U+25CF）
   - `COMPLETION_ASTERISK = '✻'`（`TEARDROP_ASTERISK`，U+273B）
2. 定义 `UserMessageProps` 接口，包含 `content: string`。
3. 实现组件：
   - 外层 `Box` 设置 `backgroundColor={theme.userMessageBackground}`、`paddingX={1}`、`paddingY={0}`。
   - 内部 `Box flexDirection="row" alignItems="flex-start"`：左侧 `❯` 前缀放入**固定 2 字符宽边沟**（`Box width={2}` 或字面量 `"❯ "`），用中性灰 `subtle`（**不染橙**）；右侧 `Text` 显示内容。
4. 使用 `memo` 包装导出。

**验证：** 临时在 `app.tsx` 中渲染一条 `<UserMessage content="test" />`，确认终端显示深色背景气泡，`❯` 位于 2 字符边沟内、占第 1 列。

## T4: 创建 ThinkingIndicator 组件

**文件：** `src/tui/components/ThinkingIndicator.tsx`
**依赖：** T1
**步骤：**
1. 定义 `ThinkingIndicatorProps` 接口，包含 `elapsedSeconds`、`expanded`、`thinking?`、`onToggle`。
2. 实现折叠态：显示 `Thinking for Xs (ctrl+o to expand)`，**不显示 `∴`、以空格占位**（与展开态 `∴ ` 等宽），使用暗淡斜体。
3. 实现展开态：显示完整 thinking 文本，**顶格不缩进**（`∴` 与助手 `●` 圆点左对齐），使用暗淡色/斜体。
4. 使用 `memo` 包装导出。

**验证：** 临时渲染并手动修改 `expanded` prop，确认折叠与展开两种状态显示正确。

## T5: 创建 AssistantMessage 组件

**文件：** `src/tui/components/AssistantMessage.tsx`
**依赖：** T1、T4
**步骤：**
1. 定义 `AssistantMessageProps` 接口，包含 `content`、`thinking?`、`expanded?`、`onToggleThinking?`。
2. 实现组件：
   - 外层 `Box flexDirection="column"`。
   - **若存在 thinking，先在顶部独立渲染一行 `ThinkingIndicator`**（顶格、与下方 `●` 圆点左对齐，思考行前不重复 `●`）。
   - 其下是 `Box flexDirection="row" alignItems="flex-start"`：左侧 `●` 圆点（`ASSISTANT_BULLET`，亮前景 `text`，**不染橙**）放入**固定 2 字符宽边沟**（`minWidth={2}`，对标 Claude Code `<NoSelect minWidth={2}>`）；右侧 `Box flexDirection="column"` 渲染内容区。
   - **完成态行**（`✻ Brewed for Xs`）：轮次结束时切换为完成式渲染，`✻`（`COMPLETION_ASTERISK`，中性 dim 色）同样使用 2 字符固定边沟，确保与上方 `●`、用户 `❯` 同列。
   - 内容区做基础格式化：按行拆分，识别代码块（```...```）和列表项（`- `）做简单样式区分；其余文本直接显示。
3. 使用 `memo` 包装导出。

**验证：** 传入含 thinking 的内容，确认思考指示器独立成行、渲染在 `●` 圆点行之前，前缀与 `●` 左对齐（同一列）、思考行前无 `●`；折叠态前缀为空格占位（无 `∴`）、展开态前缀为 `∴`；其下圆点、内容按顺序渲染。**对齐检查**：将 UserMessage（`❯`）、AssistantMessage（`●`）、完成态行（`✻`）同屏渲染，三者左边缘落在同一垂直列（详见 `claudecode-tui.md` 附录 D）。

## T6: 创建动态提示行（SpinnerGlyph + StatusIndicator）

依据 `claudecode-tui.md`，本任务实现 F8–F8e 的动态提示行。拆为三个子步骤，建议按 T6b → T6a → T6c 顺序执行。

### T6b: 定义图标帧序列与动词池

**文件：** `src/tui/constants/spinner.ts`
**依赖：** 无
**步骤：**
1. 定义进行式动词 `SPINNER_VERBS`（精选约 20 个：通用 `Thinking` / `Doing` + 花式 `Cogitating` / `Pondering` / `Brewing` / `Considering` 等）。
2. 定义完成式动词 `TURN_COMPLETION_VERBS`（与部分进行式对仗，如 `Brewing→Brewed`、`Cogitating→Cogitated`）。
3. 定义图标字符序列 `SPINNER_CHARACTERS = ['·','✢','✳','✶','✻','✽']` 与 `SPINNER_FRAMES = [...SPINNER_CHARACTERS, ...[...SPINNER_CHARACTERS].reverse()]`。

**验证：** `npm run build` 通过；人工核对动词拼写与帧序列长度（应为 12）。

### T6a: 创建 SpinnerGlyph 组件（图标脉冲 + 卡顿变红）

**文件：** `src/tui/components/SpinnerGlyph.tsx`
**依赖：** T1、T6b
**步骤：**
1. 定义 `SpinnerGlyphProps`：`{ frame: number; stalledIntensity: number }`。
2. 从 `SPINNER_FRAMES[frame % SPINNER_FRAMES.length]` 取字符，放入固定 `width={2}` 的 `Box`，防止字符宽度差异导致抖动；该 `width={2}` 即与 `❯`/`●`/`✻` 共用的 2 字符边沟，保证脉冲星号也与三者同列（详见 `claudecode-tui.md` 附录 D）。
3. 颜色：`stalledIntensity === 0` 用 `theme.primary`；`>0` 时在主色与红色间线性插值（若 smink 支持 RGB 则用 RGB 混合，否则退化为 `stalledIntensity > 0.5 ? theme.error : theme.primary`）。
4. 使用 `memo` 包装导出。

**验证：** 临时渲染并手动递增 `frame`，确认字符按 `· ✢ ✳ ✶ ✻ ✽ ✻ ✶ …` 循环；提高 `stalledIntensity` 确认颜色变红。

### T6c: 创建 StatusIndicator 组件（组装 + 动画时钟 + 状态机 + 卡顿）

**文件：** `src/tui/components/StatusIndicator.tsx`
**依赖：** T1、T6a、T6b
**步骤：**
1. 定义 `StatusIndicatorProps`：`{ verb, elapsedSeconds, tokenCount, thinkingStatus, isStreaming, columns }`。
2. 组件内部用 `setInterval`（约 100ms）维护 `tick`，**所有随时间变化的量都在本组件内派生**（不污染父级）：
   - 图标帧 `frame = Math.floor(tick / 120)`。
   - 卡顿强度：`isStreaming` 为真时归零并记录时间；否则自上次流入累计，超过阈值（如 3s）开始线性增长至 1。
   - token 平滑计数：用 ref 缓存显示值，按差距（`<70` 步 3、`<200` 按 `gap*0.15`、否则步 50）追赶 `tokenCount`。
3. 渲染：`<SpinnerGlyph frame={frame} stalledIntensity={stalledIntensity} />` + 动词文本（颜色随卡顿向红插值）+ 括号状态段；按 `columns` 逐级降级，优先级「动词 > thinking > 耗时 > token」。
4. `thinkingStatus` 文本：`'thinking'` → `thinking`；`number`（ms）→ `thought for Ns`；`null` → 不显示该段。
5. 响应结束后由父级切换 `verb` 为完成式（`Brewed for Xs`）。
6. 使用 `memo` 包装导出。

**验证：** 临时渲染并模拟流式（周期性置 `isStreaming=true` 再 false），确认图标呼吸、卡顿变红、token 平滑增长；缩小 `columns` 确认降级显示；`thinkingStatus` 三态文本正确。

## T7: 重构 InputBar 组件

**文件：** `src/tui/components/InputBar.tsx`
**依赖：** T1
**步骤：**
1. 调整 `InputBarProps`：保留 `value`、`disabled`；移除 `tokenUsage`；新增 `shortcutHint: string`；保留可选 `placeholder?`。
2. 实现上下灰白边界线：
   - `borderStyle="single"`
   - `borderColor={theme.dim}`
   - `borderTop`
   - `borderBottom`
   - `borderLeft={false}`
   - `borderRight={false}`
3. 左侧显示 `❯` 提示符，右侧为输入内容或占位符。
4. 下方 `Box justifyContent="space-between"`：左侧显示 `shortcutHint`，右侧显示 `disabled ? '等待回复中' : 'Enter 发送'`。

**验证：** 在 `app.tsx` 中引用新版 `InputBar`，确认边框与提示文字符合 Claude Code 风格。

## T8: 重构 app.tsx 状态管理与界面组合

**文件：** `src/tui/app.tsx`
**依赖：** T2、T3、T5、T6、T7
**步骤：**
1. 引入新组件：
   - `WelcomeScreen`
   - `UserMessage`
   - `AssistantMessage`
   - `StatusIndicator`
2. 新增状态（仅维护"轮次级"低频状态；图标帧/卡顿强度等"帧级"动画由 `StatusIndicator` 内部派生，见 T6c）：
   - `thinkingExpanded: Set<number>` 或 `Record<number, boolean>`，记录助手消息索引的展开状态。
   - `elapsedSeconds: number`，响应期间每秒递增（传给 `StatusIndicator`）。
   - `statusVerb: string`：本轮开始时从 `SPINNER_VERBS` 随机选取（`sample`）并整轮保持；执行任务时可被任务进行式覆盖；流结束时切换为完成式（配合 `TURN_COMPLETION_VERBS`）。
   - `thinkingStatus: 'thinking' | number | null`：思考状态机，进入思考置 `'thinking'`，离开时计算时长并至少显示 2 秒后再清空。
   - `tokenCount: number`：累计接收 token 数。
3. 在 `sendMessage` 中：
   - 启动响应时 `sample(SPINNER_VERBS)` 选定本轮动词，初始化 `elapsedSeconds = 0`、`thinkingStatus = null`。
   - 根据返回的 chunk 类型更新：收到 thinking 置 `thinkingStatus = 'thinking'`；收到 content 累计长度并产生"流入信号"供 `StatusIndicator` 复位卡顿计时；收到 usage 累加 `tokenCount`。
   - thinking 结束时计算时长写入 `thinkingStatus`。
   - 流结束时切换 `statusVerb` 为完成式（如 `Brewed for Xs`），清理计时 interval。
4. 监听 `ctrl+o`：切换最近一条助手消息（即最后一条 `role === 'assistant'` 的消息）的 thinking 展开状态。
5. 渲染逻辑（欢迎页常驻顶部，不再切换视图）：
   - **删除**原顶部独立的 smcode 标题栏（`<Box borderStyle="bold">smcode…</Box>`）。
   - 顶部常驻渲染 `<WelcomeScreen …/>`（无边框，含 cwd）。
   - 其下方为消息区（`ScrollBox`）：始终渲染；空态显示居中提示（如「输入消息开始对话…」），非空渲染消息列表（`UserMessage`/`AssistantMessage`）。
   - 加载中时在消息列表底部渲染 `StatusIndicator`。
6. 底部渲染新版 `InputBar`，`shortcutHint` 根据 `disabled` 状态切换。

**验证：** 完整运行一次对话：欢迎页 → 发送消息 → 看到处理中状态 → 看到助手回复；按 ctrl+o 可展开/折叠思考过程。

## T9: 删除 MessageBubble.tsx

**文件：** `src/tui/components/MessageBubble.tsx`
**依赖：** T3、T5
**步骤：**
1. 确认 `MessageBubble` 已不被任何文件引用。
2. 删除 `src/tui/components/MessageBubble.tsx`。

**验证：** 运行 `grep -R "MessageBubble" src/` 无结果。

## T10: 统一构建与类型检查

**文件：** 全部
**依赖：** T1-T9
**步骤：**
1. 运行 `npm run build`。
2. 修复所有 TypeScript 编译错误。
3. 运行 `npm start` 进行端到端冒烟测试。

**验证：** `npm run build` 退出码为 0，启动后主界面能正常显示欢迎页，发送消息能进入聊天视图。

## 执行顺序

```
T1 → T2 → T3 → T4 → T5 → (T6b → T6a → T6c) → T7 → T8 → T9 → T10
```

T2-T7 彼此独立，可并行开发；T6 内部按 T6b → T6a → T6c 顺序；T8 依赖所有组件就绪；T9 在 T10 统一构建之前执行。
