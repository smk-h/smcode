# Claude Code 思考过程动态提示图标机制梳理

> 本文是 smcode TUI 界面优化（第 3 章）的前置研究文档。通过阅读 Claude Code 源码
> （`claude-code/claude-code-source`），梳理其在"模型思考 / 输出过程中"那条动态提示行
> （如 `✶ Doing… (7s · ↓ 55 tokens · thinking)`）的内部实现机制，重点拆解
> **图标形态变化、大小（视觉权重）变化、动词变化** 三类动态效果，作为 smcode
> `StatusIndicator` 组件升级的设计依据。
>
> 源码版本为 React Compiler 编译产物（带 `_c` runtime），本文引用的是还原后的原始逻辑。

## 引言：两套独立的动态图标系统

Claude Code 在终端里其实运行着**两套**相互独立的"动态图标"系统，容易混淆，先做区分：

| 系统 | 位置 | 触发时机 | 核心载体 | 本章关注点 |
|------|------|----------|----------|------------|
| **Spinner（处理中提示行）** | 消息列表底部、输入框上方 | 模型思考 / 请求 / 工具调用 / 流式输出 | `components/Spinner.tsx` + `components/Spinner/*` | **本章主战场**，对应"内部思考过程、输出过程" |
| **Companion（伙伴精灵）** | 输入框右侧 | 待机陪伴、被 @ 时说话、被抚摸 | `buddy/CompanionSprite.tsx` + `buddy/*` | 第十节简述，非本章重点 |

用户截图中的 `✶ Doing… (7s · ↓ 55 tokens · thinking)` 属于 **Spinner** 系统。下文除非特别说明，"动态提示图标"均指 Spinner。

## 一、整体架构：父子两层渲染（性能分层）

Spinner 的第一个、也是最容易被忽视的设计点是**把动画时钟隔离在一个子组件里**，避免整棵子树跟着 20fps 重渲染。

```
SpinnerWithVerb            ← 父：不在动画时钟上，仅 props/state 变化时重渲染（约 25 次/turn）
 ├─ 选词（verb）
 ├─ 思考状态机（thinkingStatus）
 ├─ 任务 / teammate 聚合
 ├─ 选变体（完整 / Brief / Idle）
 └─ SpinnerAnimationRow    ← 子：拥有 useAnimationFrame(50)，承载所有 time 派生值（约 383 次/turn）
     ├─ SpinnerGlyph           （图标形态 / 卡顿颜色）
     ├─ GlimmerMessage         （动词 + 扫光 / 闪烁 / 卡顿颜色）
     └─ status parts           （计时 · token · thinking，括号包裹）
```

源码注释原话（`SpinnerAnimationRow.tsx`）：

> The parent SpinnerWithVerb is freed from the 50ms render loop and only re-renders when its props/app state change (~25x/turn instead of ~383x). That keeps the outer Box shells, useAppState selectors, task filtering, and tip/tree subtrees out of the hot animation path.

**关键结论**：所有随时间变化的视觉量（图标帧 `frame`、扫光位置 `glimmerIndex`、闪烁 `flashOpacity`、卡顿强度 `stalledIntensity`、token 计数、耗时、thinking 微光）都集中在 `SpinnerAnimationRow` 里，由单一的 `useAnimationFrame(50)`（20fps）驱动；父组件只负责"这一轮说什么词、处于什么阶段"这类低频信息。

> **可借鉴**：smink 同样基于 Ink/React，`app.tsx` 若用 `setInterval(1000)` 驱动整棵树刷新来做状态行，会让消息列表、输入框跟着每秒重渲染。应把动画状态收敛进一个独立的 `StatusIndicator` 子组件，由它独占定时器。

## 二、图标形态与"大小"变化（SpinnerGlyph）

这是"动态图标形态、大小变化"的真正来源。它**不是**旋转的 braille 点阵（`⠋⠙⠹`），而是一组**星号字符的脉冲呼吸**。

### 2.1 字符序列：从小到大的 6 级

`Spinner/utils.ts` 的 `getDefaultCharacters()` 按终端 / 平台返回一串**视觉权重递增**的字符：

```ts
// Spinner/utils.ts
export function getDefaultCharacters(): string[] {
  if (process.env.TERM === 'xterm-ghostty') {
    return ['·', '✢', '✳', '✶', '✻', '*']          // Ghostty 用 * 替代 ✽（渲染偏移）
  }
  return process.platform === 'darwin'
    ? ['·', '✢', '✳', '✶', '✻', '✽']               // macOS
    : ['·', '✢', '*', '✶', '✻', '✽']                 // Linux / Windows
}
```

肉眼上看，这 6 个字符的"占据面积 / 视觉重量"是单调递增的：从一个很小的中点 `·`，逐步长成带芒角的 `✢ ✳ ✶`，再到饱满的 `✻ ✽`。这就是"大小变化"的本质——**通过更换字符本身的视觉重量来模拟图标的呼吸缩放**，而不是真的缩放像素。

### 2.2 帧构造：正序 + 反序 = 呼吸

```ts
// SpinnerGlyph.tsx / Spinner.tsx 都各自声明了一份
const DEFAULT_CHARACTERS = getDefaultCharacters()
const SPINNER_FRAMES = [...DEFAULT_CHARACTERS, ...[...DEFAULT_CHARACTERS].reverse()]
// 6 个字符 → 12 帧：· ✢ ✳ ✶ ✻ ✽ ✻ ✶ ✳ ✢ · （首尾相接形成无缝循环）
```

正序再接反序，让图标"涨到最大再回缩"，而不是"突然从最大跳回最小"。这是一个**对称的呼吸波形**。

### 2.3 帧速率：每 120ms 一帧

```ts
const frame = reducedMotion ? 0 : Math.floor(time / 120)
const spinnerChar = SPINNER_FRAMES[frame % SPINNER_FRAMES.length]
```

`time` 是 50ms 动画时钟累计的毫秒数；`Math.floor(time / 120)` 意味着每 120ms 推进一帧。12 帧一个完整周期 ≈ **1.44 秒一次呼吸**。注意：动画时钟 50ms 触发一次重渲染，但帧号 120ms 才变一次——**刷新率（20fps）与帧切换速率（≈8fps）是解耦的**，前者保证其它动画（扫光等）平滑，后者控制图标不至闪烁过快。

### 2.4 布局稳定：固定 1×2 盒子

```tsx
<Box flexWrap="wrap" height={1} width={2}>
  <Text color={messageColor}>{spinnerChar}</Text>
</Box>
```

图标被锁死在一个 `height={1} width={2}` 的盒子里。原因：`·` 和 `✽` 的实际渲染宽度/高度有差异，若不固定容器，图标"长大"时会顶动右侧的动词文本，造成整行抖动。**先占位、再填字符**，是终端动画防抖的常用手段。

> **可借鉴**：smcode 的 `StatusIndicator` 若要做星号脉冲，务必给图标列固定宽度，否则 `·`→`✽` 切换时动词文字会左右跳。

## 三、动词变化（Verb）

"动词变化"有两层含义：**这一轮用哪个词**（轮次级），以及**思考结束切到过去式**（事件级）。

### 3.1 进行式动词池（180+ 个花式词）

`constants/spinnerVerbs.ts` 维护了一个非常长的动名词列表 `SPINNER_VERBS`，节选：

```
Accomplishing, Brewing, Cerebrating, Claudeing, Cogitating, Combobulating,
Contemplating, Crunching, Deliberating, Doing, Forgifying, Imagining,
Mulling, Pondering, Processing, Ruminating, Simmering, Thinking, Vibing,
Working, Zigzagging ...（共 180+ 个）
```

这些词大多带有"烹调 / 冥想 / 捣鼓"的趣味色彩（Brewing 调酒、Cogitating 冥想、Simmering 炖煮），让等待过程不那么枯燥。甚至有自嘲的 `Claudeing`、`Discombobulating`、`Flibbertigibbeting`。

### 3.2 选词优先级：一轮只选一次

`Spinner.tsx` 里动词的来源是一条**短路优先级链**：

```ts
// 挂载时随机挑一个，整轮不变（useState 初始化器只跑一次）
const [randomVerb] = useState(() => sample(getSpinnerVerbs()))

// 优先级：外部覆盖 > 当前任务的进行式 > 当前任务标题 > 随机词
const leaderVerb =
  overrideMessage
  ?? currentTodo?.activeForm      // 如 "Running tests"
  ?? currentTodo?.subject
  ?? randomVerb

const effectiveVerb =
  foregroundedTeammate && !foregroundedTeammate.isIdle
    ? foregroundedTeammate.spinnerVerb ?? randomVerb   // 看队友时用队友的词
    : leaderVerb

const message = effectiveVerb + '…'   // 统一加省略号
```

要点：

1. **`sample()` 只在挂载时调用一次**——同一轮对话里动词**不会**变来变去，避免视觉噪音；只有开启新一轮才会重新摇号。
2. **任务感知**：如果正在执行某个 todo，且该 todo 声明了 `activeForm`（进行式短语，如 "Running tests"），就用它替代花式随机词——动态图标从"装可爱"切换为"说人话"。
3. **可配置**：`getSpinnerVerbs()` 会读取 `settings.spinnerVerbs`，支持 `replace`（整体替换）和 `append`（追加）两种模式，用户可自定义动词池。

### 3.3 完成式动词（轮次结束）

`constants/turnCompletionVerbs.ts` 提供一组**过去式**，配合 "for Ns" 在结束时展示：

```ts
export const TURN_COMPLETION_VERBS = [
  'Baked', 'Brewed', 'Churned', 'Cogitated',
  'Cooked', 'Crunched', 'Sautéed', 'Worked',
]
// 渲染为："✶ Brewed for 7s"
```

注意它们与进行式动词是**语义对仗**的（Brewing → Brewed、Cogitating → Cogitated），形成"正在做 → 做完了"的闭环。

> **可借鉴**：smcode 现有 `StatusIndicator` 只有一个静态 `verb` 字符串（"Thinking..." / "Doing..."）。可引入"花式动词池 + 随机选词 + 任务感知覆盖 + 完成式闭环"的整套机制，让等待体验更生动。

## 四、颜色与光的动态

Spinner 同时跑着三种颜色动效，叠加在图标和动词文本上。

### 4.1 卡顿变红（useStalledAnimation）

最实用的反馈：**token 流停了，图标会慢慢变红**。

```ts
// Spinner/useStalledAnimation.ts
// 3 秒内没有新 token 进来，就判定为 stalled
const isStalled = timeSinceLastToken > 3000 && !hasActiveTools
const intensity = isStalled
  ? Math.min((timeSinceLastToken - 3000) / 2000, 1)   // 再用 2 秒从 0 渐变到 1
  : 0
```

`intensity` 不是阶跃的，而是被一个**指数缓动**平滑过（每 50ms 一步，`current += diff * 0.1`），所以颜色是"慢慢染红"而非"突然变红"。最终颜色由 `interpolateColor` 在主题色与 `ERROR_RED = {r:171,g:43,b:63}` 之间线性插值：

```ts
// SpinnerGlyph.tsx
if (stalledIntensity > 0) {
  const interpolated = interpolateColor(baseRGB, ERROR_RED, stalledIntensity)
  return <Text color={toRGBColor(interpolated)}>{spinnerChar}</Text>
}
```

一旦有新 token 进来，`stalledIntensityRef.current = 0` 立即复位，图标恢复主题色。`hasActiveTools` 为真时（正在跑工具）强制不算卡顿——因为工具执行期间本来就不该有 token 流。

### 4.2 扫光（GlimmerMessage）

动词文本上有一道**横向掠过的高光**，宽度为 3 列（`glimmerIndex-1` 到 `glimmerIndex+1`），用更亮的 `shimmerColor` 渲染。

```ts
// SpinnerAnimationRow.tsx
const glimmerSpeed = mode === 'requesting' ? 50 : 200   // 请求阶段快，其它慢
const cycleLength = glimmerMessageWidth + 20
const cyclePosition = Math.floor(time / glimmerSpeed)
const glimmerIndex =
  mode === 'requesting'
    ? (cyclePosition % cycleLength) - 10              // 从左往右扫（请求：数据在"进来"）
    : glimmerMessageWidth + 10 - (cyclePosition % cycleLength)  // 从右往左扫（输出：数据在"出去"）
```

扫光方向不是随便选的：**`requesting`（发请求）时从左往右，像在"吸入"；输出阶段从右往左，像在"吐出"**。这是用动画方向暗示数据流向的细节。

卡顿时扫光会被关掉（`glimmerIndex = -100`），把视觉焦点让给"变红"。

### 4.3 tool-use 整段闪烁

工具调用阶段（`mode === 'tool-use'`），不再用窄扫光，而是**整段动词文本随正弦波在 base 色 / shimmer 色之间呼吸**：

```ts
const flashOpacity = mode === 'tool-use'
  ? (Math.sin(time / 1000 * Math.PI) + 1) / 2     // 0→1→0，2 秒一周期
  : 0
```

### 4.4 thinking 字样的微光

括号里的 `thinking` 文本自己也有呼吸光（详见下节）。

> **可借鉴**：smcode 若只做"状态行文字"，反馈太弱。卡顿变红是性价比最高的一项——它把"模型是不是卡住了"这个用户最焦虑的问题，变成了一个无需看 token 计数就能感知的视觉信号。

## 五、思考状态机（thinkingStatus）

括号末尾那个 `thinking` / `thought for Ns` 不是简单文本，而是一个三态有限状态机，目的是**消除 UI 抖动**。

```ts
// Spinner.tsx
const [thinkingStatus, setThinkingStatus] = useState<'thinking' | number | null>(null)
```

| 状态值 | 含义 | 显示文本 |
|--------|------|----------|
| `null` | 未在思考 | （不显示 thinking 段） |
| `'thinking'` | 正在思考 | `thinking` 或 `thinking${effortSuffix}` |
| `number`（毫秒时长） | 思考刚结束 | `thought for Ns` |

切换规则（`useEffect` 监听 `mode`）：

- **进入 thinking**：记录开始时间，置 `'thinking'`。
- **离开 thinking**：计算实际时长 `duration`。
  - 若实际思考不足 2 秒，则**继续显示 `'thinking'` 字样直到凑满 2 秒**，再切到时长；
  - 切到时长后再显示 **2 秒**，然后清空为 `null`。

这两处"最少 2 秒"是为了防止"思考闪了一下就消失"的 UI jank——真实思考可能只有几百毫秒，但用户需要时间看清反馈。

思考文本自身的微光（`SpinnerAnimationRow.tsx`）：

```ts
const THINKING_DELAY_MS = 3000       // 思考开始 3 秒后才显示 thinking 字样
const THINKING_GLOW_PERIOD_S = 2     // 2 秒一个呼吸周期
const thinkingOpacity =
  time < THINKING_DELAY_MS ? 0
  : (Math.sin(thinkingElapsedSec * Math.PI * 2 / 2) + 1) / 2
const thinkingShimmerColor =
  toRGBColor(interpolateColor(THINKING_INACTIVE /*153灰*/, THINKING_INACTIVE_SHIMMER /*185亮灰*/, thinkingOpacity))
```

即：思考开始的前 3 秒**完全不显示** thinking 字样（避免短思考的噪音），3 秒后以 2 秒周期在深灰/浅灰间正弦呼吸。

> **可借鉴**：smcode 现有 `ThinkingIndicator` 只有"折叠/展开"两态。可借鉴"三态机 + 最短显示时长"思路，避免思考状态在流式 chunk 间频繁闪烁。

## 六、渐进式信息显示（宽度自适应）

括号里的内容不是固定的，而是**按终端宽度从左到右逐步显露**：

```
宽终端：✶ Doing… (7s · ↓ 55 tokens · thinking)
中终端：✶ Doing… (7s · ↓ 55 tokens)
窄终端：✶ Doing… (thinking)
极窄：  ✶ Doing…
```

实现是一次性算出各段宽度，按优先级链式判断：

```ts
// SpinnerAnimationRow.tsx
const availableSpace = columns - messageWidth - 5
let showThinking = wantsThinking && availableSpace > thinkingWidthValue
// 空间不够又想显示 thinking 时，先尝试去掉 effortSuffix 只剩 "thinking"
if (!showThinking && wantsThinking && thinkingStatus === 'thinking' && effortSuffix) {
  if (availableSpace > THINKING_BARE_WIDTH) { thinkingText = 'thinking'; ... }
}
const showTimer   = wantsTimerAndTokens && availableSpace > usedAfterThinking + timerWidth
const showTokens  = wantsTimerAndTokens && availableSpace > usedAfterTimer + tokensWidth
```

优先级：**动词 > thinking > 计时 > token**。token 还有"30 秒后才默认显示"的门槛（`SHOW_TOKENS_AFTER_MS = 30_000`），短任务不显示 token，避免数字噪音。

> **可借鉴**：smcode 在 80 列终端也要保证状态行不撑爆 / 不换行，应引入同样的"按可用宽度逐级降级显示"。

## 七、Token 计数平滑动画

token 数不是跳变的，而是**缓动追赶**真实值，呈现"数字滚动"效果：

```ts
// SpinnerAnimationRow.tsx
const gap = currentResponseLength - tokenCounterRef.current
if (gap > 0) {
  let increment
  if (gap < 70)       increment = 3                         // 接近时小步
  else if (gap < 200) increment = Math.max(8, Math.ceil(gap * 0.15))  // 中等差距按比例
  else                increment = 50                        // 差距大时大步
  tokenCounterRef.current = Math.min(tokenCounterRef.current + increment, currentResponseLength)
}
const leaderTokens = Math.round(displayedResponseLength / 4)   // 约 4 字符 ≈ 1 token
```

差距越大、步长越大，既保证追赶速度，又保证追上后不抖。`/ 4` 是"4 个字符约等于 1 个 token"的经验估算，避免引入昂贵的真实分词器。

## 八、五种 SpinnerMode

`SpinnerMode` 是驱动上述所有差异的"总开关"：

```ts
type SpinnerMode = 'requesting' | 'thinking' | 'tool-use' | 'tool-input' | 'responding'
```

| mode | 语义 | 扫光方向 / 速度 | 闪烁 | 模式小箭头 |
|------|------|-----------------|------|-----------|
| `requesting` | 发起 API 请求中 | 左→右 / 50ms 快 | — | `↑`（上行） |
| `thinking` | 模型思考中 | 右→左 / 200ms | — | `↓` |
| `tool-use` | 工具执行中 | — | 正弦呼吸 | `↓` |
| `tool-input` | 等待工具输入 | 右→左 | — | `↓` |
| `responding` | 流式输出正文 | 右→左 / 200ms | — | `↓` |

`SpinnerModeGlyph` 还会在 token 数前渲染一个 `↑/↓` 小箭头，进一步暗示数据方向。

## 九、无障碍：reducedMotion 降级

`settings.prefersReducedMotion` 为真时，整套动画降级为"几乎静止"：

- 图标：固定 `●` 圆点，2 秒周期明暗（1 秒亮 / 1 秒 dim），`REDUCED_MOTION_CYCLE_MS = 2000`。
- 帧号：`frame = 0`，不再脉冲。
- 扫光 / 闪烁 / thinking 微光：全部置 0 / 关闭（`glimmerIndex = -100`、`flashOpacity = 0`）。
- token 计数：直接等于真实值，不缓动。
- 卡顿强度：即时阶跃，不做指数缓动。

```ts
const [viewportRef, time] = useAnimationFrame(reducedMotion ? null : 50)
```

`useAnimationFrame(null)` 直接**退订定时器**——连 20fps 的空转都不再发生，对电量 / 终端负载友好。

> **可借鉴**：动态效果虽好，但必须提供"关闭动画"的降级路径。smcode 可在 config 里加 `reducedMotion` 开关。

## 十、伙伴精灵 Companion（buddy）—— 待机陪伴系统

另一套动态图标，位于输入框右侧，是一个会动的 ASCII 小精灵（电子宠物）。本章不作深挖，仅记录其动态机制以备后续：

- **生成**：`buddy/companion.ts` 用 `mulberry32(hash(userId + SALT))` 确定性随机出 18 种物种（duck / cat / dragon / octopus / robot ...）+ 眼睛 + 帽子 + 稀有度，整账号固定一只。
- **多帧 sprite**：`buddy/sprites.ts` 每种物种 3 帧 ASCII 图（`{E}` 占位符替换为眼睛字符），`renderSprite(bones, frame)` 按帧取图。
- **待机动画**：`CompanionSprite.tsx` 以 `TICK_MS = 500` 推进 `IDLE_SEQUENCE = [0,0,0,0,1,0,0,0,-1,0,0,2,0,0,0]`——大多数时间趴着（帧 0），偶尔 fidget（帧 1-2），罕见眨眼（`-1` 表示把眼睛字符替换成 `-`）。
- **兴奋态**：被 @ 说话或被 `/buddy pet` 抚摸时，`spriteFrame = tick % frameCount` 快速循环全部帧；抚摸还会在头顶生成 `PET_HEARTS`（5 帧爱心上升，约 2.5 秒）。
- **说话气泡**：`SpeechBubble` 显示 quip，约 10 秒（`BUBBLE_SHOW = 20` ticks）后消失，最后 3 秒（`FADE_WINDOW = 6`）淡出。

这是"待机陪伴"维度的动态图标，与 Spinner 的"工作反馈"维度互补。

## 十一、smcode 可借鉴的实现要点（小结）

按性价比从高到低排序，建议 smcode `StatusIndicator` 升级时优先落地：

1. **图标脉冲呼吸**：用 `['·','✢','✳','✶','✻','✽']` 正反序构造 12 帧，120ms/帧，固定宽度容器。这是"动态图标"最直观的载体。
2. **动词池 + 随机选词**：维护一个花式动词数组，每轮 `sample()` 一次；任务进行中可被 `activeForm` 覆盖；结束时切完成式（`Brewed for Ns`）。
3. **卡顿变红**：3 秒无新内容则把图标/文本从主题色缓动到红色，是最有信息量的状态反馈。
4. **思考状态机**：`'thinking' | 时长 | null` 三态 + 最短 2 秒显示，消除抖动。
5. **宽度自适应**：按终端列数逐级降级显示 `thinking / 计时 / token`。
6. **token 平滑计数**：差距越大步长越大的缓动追赶。
7. **动画时钟隔离**：把所有 time 派生值收敛进 `StatusIndicator` 子组件独占的定时器，不污染消息列表与输入框。
8. **reducedMotion 降级**：提供关闭动画的开关，退订定时器。

> 以上 1–8 项的具体落地方案见 `plan.md`（模块与数据结构）、`task.md`（任务分解）、`checklist.md`（验收项）。

## 附录 B：Claude Code 欢迎页（LogoV2）源码梳理

smcode 欢迎页需与 Claude Code「完全一致」，故单独梳理其欢迎页实现。Claude Code 的欢迎页由 `components/LogoV2/` 下的一组组件构成。

### B.1 两个层次：WelcomeV2 横幅 与 LogoV2 主卡

- **WelcomeV2.tsx**：首次启动的 ASCII 横幅 banner（`WELCOME_V2_WIDTH = 58` 列），顶部一行 `Welcome to Claude Code v{VERSION}`（claude 橙 + 版本 dim），下方是大段 ASCII art（Clawd 小图 + 云朵 `░▒` + 星星 `*`）。这是**一次性横幅**，不是常驻欢迎卡。
- **LogoV2.tsx**：常驻的**欢迎主卡**（圆角边框 + 边框标题），即用户看到的 `Welcome back!` 卡片。**本章 smcode 要复刻的是 LogoV2 主卡。**

### B.2 LogoV2 主卡结构

外层 `Box`：`borderStyle="round"` + `borderColor="claude"`，并通过 `borderText` 在**顶部边框中央**渲染标题——标题名用 claude 橙、版本号用 inactive 灰，形如 ` Claude Code v2.1.175 `。

内层 `Box flexDirection="row"` 分三栏：

1. **左列**（宽度由 `calculateOptimalLeftWidth` 动态决定，上限 `MAX_LEFT_WIDTH = 50`）：
   - `formatWelcomeMessage(username)`：有用户名则 `Welcome back {user}!`，否则 `Welcome back!`（inactive 灰）
   - `Clawd` 吉祥物（见 B.3）
   - 模型 · 计费：`formatModelAndBilling`，订阅用户显示套餐名、API 用户显示 `API Usage Billing`；宽不足则拆两行（inactive dim）
   - 当前目录 `cwd`（inactive dim）
2. **竖线分隔**：一个仅 `borderLeft` 的 1 列 `Box`，`borderStyle="single"` + `borderColor="claude"` + `borderDimColor`，把左右两栏分开。
3. **右列**（`flexGrow={1}`）：`FeedColumn` 渲染若干 `FeedConfig`，每个含 `title`（claude 橙 bold）+ 多行 `lines`（dim）+ 可选 `footer` / `emptyMessage`。

### B.3 Clawd 吉祥物（Clawd.tsx）

9 列宽、3 行高的方块小怪兽，用 Unicode 半块字符拼出：

```
 ▐▛███▜▌
▝▜█████▛▘
  ▘▘ ▝▝
```

- 主体用 `clawd_body` 色（= claude 橙 `rgb(215,119,87)`）+ `clawd_background`（纯黑 `rgb(0,0,0)`）背景填充中间 5/5 列；
- 通过 `POSES` 切换 4 种姿态：`default` / `arms-up`（举手，跳跃时）/ `look-left` / `look-right`（换眼字符 `▛▜`→`▙▟`）；
- Apple Terminal 走 `AppleTerminalClawd` 分支（背景填充技巧兼容其渲染 quirks）。

### B.4 布局计算（logoV2Utils.ts）

- `getLayoutMode(columns)`：`columns >= 70` → `horizontal`（左右分栏），否则 `compact`（垂直堆叠）。
- `calculateOptimalLeftWidth(welcome, cwd, modelLine)`：`min(max(各文本宽度, 20) + 4, 50)`。
- `calculateLayoutDimensions`：由左宽推算右宽与总宽，预留边框/分隔/内边距。
- `getLogoDisplayData()`：集中产出 `version / cwd / billingType / agentName`。

### B.5 右侧 Feed 内容（feedConfigs.tsx）

Claude Code 默认渲染两个 Feed：

- **Recent activity**：最近会话（`loadMessageLogs`），空时 `No recent activity`，有内容时尾部 `footer: /resume for more`。
- **What's new**：release notes（`getRecentReleaseNotesSync`），空时 `Check the Claude Code changelog for updates`，尾部 `footer: /release-notes for more`。

另有 `Tips for getting started`（项目 onboarding 步骤）与 `3 guest passes` 等条件性 Feed。

### B.6 smcode 复刻要点（结构对齐、内容替换）

smcode 无会话历史 / release notes / 订阅体系，故在**结构完全对齐**的前提下做内容替换：

| 要素 | Claude Code | smcode 复刻 |
|------|-------------|-------------|
| 边框标题 | `Claude Code v2.x` | `smcode v0.0.0`（claude 橙 + 版本灰） |
| 左列欢迎语 | `Welcome back{user}!` | `Welcome back!`（无用户名系统） |
| 吉祥物 | Clawd 9×3 | 同样 Clawd（直接复刻 ASCII） |
| 模型 · 计费 | `{model} · {套餐/API Usage Billing}` | `{model} · {provider}`（provider 代替计费） |
| 当前目录 | `getDisplayPath(cwd)` | `process.cwd()` |
| 竖线分隔 | `borderLeft` + `borderDimColor` | 同 |
| 右列 Feed | Recent activity / What's new | Tips for getting started / What's new（硬编码） |

复刻后 smcode 欢迎页与 Claude Code 在**边框标题、吉祥物、左栏信息排布、竖线分隔、右栏双 Feed** 上完全一致，仅文案随 smcode 能力做最小替换。

## 附录：关键源码文件索引

| 关注点 | 文件 |
|--------|------|
| Spinner 主组件（父） | `src/components/Spinner.tsx` |
| 动画行（子，50ms 时钟） | `src/components/Spinner/SpinnerAnimationRow.tsx` |
| 图标形态 | `src/components/Spinner/SpinnerGlyph.tsx` |
| 图标字符序列 / 颜色插值 | `src/components/Spinner/utils.ts` |
| 动词 + 扫光渲染 | `src/components/Spinner/GlimmerMessage.tsx` |
| 扫光 hook | `src/components/Spinner/useShimmerAnimation.ts` |
| 卡顿检测 | `src/components/Spinner/useStalledAnimation.ts` |
| 进行式动词池 | `src/constants/spinnerVerbs.ts` |
| 完成式动词 | `src/constants/turnCompletionVerbs.ts` |
| 伙伴精灵 sprite | `src/buddy/sprites.ts`、`src/buddy/CompanionSprite.tsx` |
| 伙伴生成 | `src/buddy/companion.ts`、`src/buddy/types.ts` |
| 欢迎页 LogoV2 | `src/components/LogoV2/LogoV2.tsx`、`WelcomeV2.tsx`、`Clawd.tsx`、`feedConfigs.tsx`；`src/utils/logoV2Utils.ts` |

## 附录 C：备用屏幕（alt screen）与退出清屏机制（暂不实现）

> **本章已决定不实现备用屏幕与退出清屏机制。** 下文保留对 Claude Code 机制的研究记录，供后续章节参考；当前 smcode 将直接渲染在主屏幕，Ctrl+C 退出后对话内容保留在终端滚动历史中，不输出 `Resume this session with:` 提示。

Claude Code 启动后整个 TUI 渲染在终端的**备用屏幕缓冲区**（alternate screen buffer，DEC 私有模式 `?1049`），而非主屏幕。因此 Ctrl+C 退出时只需「离开备用屏幕」，主屏幕（用户启动前的 shell 输出）便原样恢复，TUI 期间渲染的所有对话内容随备用屏幕一并丢弃——这就是"退出后对话消失、只剩 shell 与一行恢复提示"的来源。

### C.1 Claude Code 的机制（源码实证，`claude-code/claude-code-source`）

- **alt screen 进/出序列**（`src/ink/termio/dec.ts`）：`ENTER_ALT_SCREEN = "\x1B[?1049h"`、`EXIT_ALT_SCREEN = "\x1B[?1049l"`（DECSET/DECRST 1049）。进入时附 `\x1B[2J\x1B[H` 清屏 + 光标归位。
- **退出编排**（`src/utils/gracefulShutdown.ts`）：
  - `cleanupTerminalModes()`（L59-136）：unmount Ink → 触发 `AlternateScreen` cleanup 写 `\x1B[?1049l`（切回主屏）→ 恢复光标 `\x1B[?25h`、关鼠标等。
  - `printResumeHint()`（L173-178）：`writeSync(1, chalk.dim('\nResume this session with:\nclaude --resume <id>\n'))` —— 用 **`fs.writeSync` 同步写**（非 `console.log`），保证 `process.exit` 前刷盘。
  - **退出顺序铁律**（L71-72、L436-437）：**先** `cleanupTerminalModes()`（切回主屏）→ **再** `printResumeHint()`。注释原话："Exit alt screen FIRST so printResumeHint() ... land on the main buffer."
- **session id**（`src/bootstrap/state.ts`）：启动时 `randomUUID()`（L331），`getSessionId()`（L431）取出拼进提示。
- **分层**：alt screen「能力」（序列常量 + `AlternateScreen` 组件）在 Ink 层（`ink/`）；退出「编排」（信号注册、顺序、提示、failsafe）在应用层（`utils/gracefulShutdown.ts`）。**smink 只抽了 Ink 层那半，退出编排在应用层自写。**

### C.2 smcode 方案演进（关键：避免重复踩坑）

**第一版（已废弃）——用 smink `<AlternateScreen>` 组件包裹 `<App>`：**
smink 抽取了 Claude Code 的 `AlternateScreen` 组件（`@smai-kit/smink`），内部用 `useInsertionEffect` 在 React mutation 阶段写 `ENTER_ALT_SCREEN`，并用 `<Box height={rows} width="100%">` 约束 children。直接 `<AlternateScreen><App/></AlternateScreen>` 包裹看似最省事。

**问题：欢迎页圆角边框断裂。** 该组件的 `useInsertionEffect` 原始字节写入 + `Box height/width` 约束，与 smink 双缓冲渲染管线存在**时序竞争**：`WelcomeScreen` 的 `borderText + borderStyle="round"` 圆角在首帧按尚未稳定的宽度绘制，导致四角圆角与边框线拼接错位断裂。Claude Code 自带的 `AlternateScreen` 能用，是因为它与自己的 Ink 渲染器深度协同；smink 抽取版 + smcode 的组合下暴露了此问题。

**终版（原方案，已废弃）——手动写 DEC 1049 转义序列，绕开组件：**
不挂 `<AlternateScreen>` 组件，而是在 `index.tsx` 调用 `render()` **之前**手动 `writeSync(1, '\x1B[?1049h\x1B[2J\x1B[H')` 进入备用屏幕，`waitUntilExit()` 之后手动 `writeSync(1, '\x1B[?1049l')` 离开。smink 完全不感知 alt screen 的存在，只是往「当前屏」渲染——从首帧起就在**稳定的备用屏幕**渲染，消除了组件层时序竞争，边框恢复正常。该方案在本章最终未采用。

### C.3 smcode 落地（已废弃）

> 本节原方案（`src/utils/terminal.ts` + 手动 DEC 1049 序列）已废弃，本章不再实现备用屏幕进/出与会话恢复提示。若后续章节需要，可从这里恢复设计。

原方案中终端控制原语集中在 `src/utils/terminal.ts`（对标 Claude Code `utils/gracefulShutdown.ts` 的职责分层）：

| 函数 | 实现 | 对标 Claude Code |
|------|------|------------------|
| `enterAltScreen()` | `writeSync(1, '\x1B[?1049h\x1B[2J\x1B[H')` | `AlternateScreen` 进入序列 |
| `exitAltScreen()` | `writeSync(1, '\x1B[?1049l')` + `'\x1B[?25h'` | `cleanupTerminalModes` 切回主屏 + 显光标 |
| `printResumeHint(id)` | `writeSync(1, '\nResume this session with:\nsmcode --resume <id>\n')` | `printResumeHint` |

`src/index.tsx` 的 `main()` 原编排（退出顺序铁律）：`enterAltScreen()` → `try { selectProvider / render(<App/>) / waitUntilExit } finally { exitAltScreen() }` → `printResumeHint(sessionId)`。`sessionId = randomUUID()`（`node:crypto`）。整个流程（Provider 选择 + 主聊天）共用同一个备用屏幕。

> smcode 为精简实现，暂不含 Claude Code `gracefulShutdown.ts` 的 session 持久化、SessionEnd hooks、analytics flush、failsafe 定时器、SIGTERM/SIGHUP 兜底等（按需叠加，对标时再补）。
> 当前会话 ID 为随机 UUID 仅作展示，暂未实现真正的 `--resume` 恢复（需额外持久化会话历史到磁盘）。

## 附录 D：三个消息前缀图标（❯ / ● / ✻）及其垂直对齐机制

> 用户截图中消息区左边缘出现的三个单字符前缀图标（用户消息 `❯`、助手消息 `●`、轮次完成态 `✻`），在
> Claude Code 里**共用同一列、形成一条垂直对齐的"装订线"**。本节从源码实证其字符身份、颜色与对齐机制，
> 作为 smcode `UserMessage` / `AssistantMessage` / 完成态行三者的对齐依据。

### D.1 三个图标的身份（字符 · 常量 · 颜色）

三个图标各自来自一个常量，定义在 `constants/figures.ts`（`figures.pointer` 来自 npm `figures` 包）：

| 角色 | 字符 | Unicode | 源码常量 | 颜色（源码） | 渲染位置 |
|------|------|---------|----------|--------------|----------|
| 用户消息前缀 | `❯` | U+276F | `figures.pointer` | `subtle`（暗灰，选中时 `suggestion`） | `HighlightedThinkingText.tsx` |
| 助手消息前缀 | `●` | U+25CF | `BLACK_CIRCLE`（macOS 为 `⏺` U+23FA） | `text`（默认前景/白，选中时 `suggestion`） | `AssistantTextMessage.tsx` |
| 轮次完成态前缀 | `✻` | U+273B | `TEARDROP_ASTERISK` | `dimColor`（暗灰） | `SystemTextMessage.tsx` → `TurnDurationMessage` |

要点：

1. **字符身份**：用户前缀是 `figures.pointer`（右尖角 `❯`，非普通 `>`），助手前缀是 `BLACK_CIRCLE`（实心圆 `●`，macOS 用更圆的 `⏺` 以获得更好的垂直对齐——源码注释原话 "The former is better vertically aligned"），完成态是 `TEARDROP_ASTERISK`（泪滴星号 `✻`）。
2. **颜色都不是品牌橙**：三者都是**中性灰/白**（`subtle` / `text` / `dimColor`）。品牌橙（`claude` 珊瑚色）用在欢迎页边框、Clawd、以及**处理中**的脉冲星号上，而非这三个静态前缀。smcode 若要"像 Claude Code"，前缀应保持中性，不要染橙。
3. **完成态 `✻` 与处理中脉冲星号是不同来源**：处理中行用的是 `SpinnerGlyph` 的呼吸帧序列（`· ✢ ✳ ✶ ✻ ✽`，含 `✻` 但在动）；而轮次结束的完成态行是**静态**的 `TEARDROP_ASTERISK` `✻`，由独立的 `TurnDurationMessage` 渲染（配 `Brewed for Ns` 等完成式动词）。

### D.2 为什么三者能"垂直中心对齐"：固定 2 字符宽边沟（gutter）

三个图标之所以能在不同消息行里**左边缘齐平、形成一条垂直线**，核心机制是：**每个前缀都被放进一个固定宽度为 2 字符的"边沟"里**（字符占 1 格 + 1 格空格留白），内容区统一从第 2 列开始。

源码中三种等价的 2 字符边沟写法：

```tsx
// ① 用户消息：直接用字面量 "❯ "（pointer + 空格），渲染在带 userMessageBackground 的行首
<Text color={pointerColor}>{figures.pointer} </Text>   // "❯ " = 2 字符

// ② 助手消息：NoSelect + minWidth={2}（防选区选中边沟）
<NoSelect fromLeftEdge minWidth={2}>
  <Text color={isSelected ? 'suggestion' : 'text'}>{BLACK_CIRCLE}</Text>
</NoSelect>                                              // ● 占 1 格，minWidth 补到 2

// ③ 完成态行：Box minWidth={2}
<Box minWidth={2}><Text dimColor>{TEARDROP_ASTERISK}</Text></Box>   // ✻ 占 1 格，minWidth 补到 2
```

三者的**外层行**结构一致：

```tsx
<Box flexDirection="row" alignItems="flex-start" width="100%">
  {/* 2 字符边沟：❯ / ● / ✻ */}
  <Box flexDirection="column">{/* 内容区，从第 2 列起 */}</Box>
</Box>
```

为什么必须是**固定宽度**而非让字符自然排布？因为 `❯`、`●`、`✻` 三个字符在不同字体/终端下的实际渲染宽度并不完全一致（有的宽半格、有的带边距），若各自自然排布，内容区起始列会左右错动，三个图标就无法落在同一列。**先占位（固定 2 格）、再填字符**，是把异形字符"焊"进同一列的终端防抖通用手段（与 Spinner 的 `width={2}` 同理，见 §2.4）。

> **"垂直中心对齐"的含义**：用户期望的是这三个前缀**落在同一垂直列**（左边缘齐平，形成一条视觉上的竖线）。源码用"固定 2 字符边沟 + 行首起始"实现这一点。注意行内是 `alignItems="flex-start"`（图标顶对齐到所在行顶部），而非把图标相对多行内容垂直居中——Claude Code 的图标是顶格的，smcode 应保持一致。

### D.3 smcode 复刻要点

1. **统一边沟宽度**：用户消息 `❯`、助手消息 `●`、完成态 `✻`（以及处理中脉冲星号）**全部**放进 `width={2}`（或 `minWidth={2}`）的 `Box`，字符居左、右侧 1 格留白；不要用裸字符。
2. **字符常量集中管理**：在 `constants` 下定义 `USER_POINTER = '❯'`、`ASSISTANT_BULLET = '●'`、`COMPLETION_ASTERISK = '✻'`，避免散落硬编码（对标 Claude Code `figures.ts`）。
3. **颜色保持中性**：`❯` 用 `subtle`/dim、`●` 用 `text`/亮、`✻` 用 dimColor；**不要**染成品牌橙（橙是处理中脉冲与欢迎页的品牌色）。
4. **完成态行单独渲染**：`✻ Brewed for Xs` 用与 `❯`/`●` 相同的 2 字符边沟 + `flexDirection="row"` 行结构，确保 `✻` 与上方 `●`、`❯` 同列；它与处理中的脉冲星号线是**两种状态**（处理中 → 完成态），切换时图标列不变、只有图标字符与文案变。
5. **`alignItems="flex-start"`**：行内图标顶对齐，与 Claude Code 一致；多行内容时图标停在首行行首，不随内容垂直居中。

> 以上要点已落入 `spec.md`（F5/F6/F8b）、`plan.md`（UserMessage / AssistantMessage / 完成态行）、`task.md`（T3/T5/T6c）与 `checklist.md`（对齐验收项）。
