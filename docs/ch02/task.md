# smcode 第 2 章：多 Provider 切换 Tasks

## 文件清单

| 操作 | 文件 | 职责 |
|------|------|------|
| 修改 | `src/config/types.ts` | 扩展为 `AppConfig`、`ProviderItemConfig`、`ProviderSelectionResult` |
| 修改 | `src/config/loader.ts` | 支持解析 `providers` 数组与旧格式字段，统一返回 `AppConfig` |
| 新建 | `src/config/resolver.ts` | 解析 Provider 列表，判断是否需要进入选择界面 |
| 修改 | `src/provider/factory.ts` | 入参改为 `ProviderItemConfig` |
| 修改 | `src/provider/openai.ts` | 构造函数接收 `ProviderItemConfig`，透传 `thinking` 字段 |
| 新建 | `src/tui/components/ProviderSelector.tsx` | 基于 smink 的 Provider 选择界面 |
| 修改 | `src/index.ts` | 调整启动流程：加载 → 解析 → 选择/直接启动 → 渲染 App |
| 修改 | `.smcode/config.yaml` | 更新为多 Provider 示例配置 |
| 修改 | `.smcode/config.example.yaml` | 同步更新为示例配置 |

## T1: 扩展配置类型定义

**文件：** `src/config/types.ts`
**依赖：** 无
**步骤：**
1. 定义 `ProviderItemConfig` 接口，字段包括 `name`、`protocol`、`model`、`baseUrl`、`apiKey`、`thinking`。
2. 定义 `AppConfig` 接口，包含可选的 `providers?: ProviderItemConfig[]` 与第 1 章遗留字段（`protocol?`、`model?`、`baseUrl?`、`apiKey?`、`thinking?`）。
3. 定义 `ProviderSelectionResult` 接口，字段包括 `selected?`、`items`、`needsSelection`。
4. 保留 `ProviderConfig` 别名或标记为已弃用，确保旧引用可平滑迁移。

**验证：** `npm run build` 成功（该文件无外部依赖）。

## T2: 修改配置加载器支持多 Provider

**文件：** `src/config/loader.ts`
**依赖：** T1
**步骤：**
1. 将 `loadConfig` 返回类型改为 `AppConfig`。
2. 解析 YAML 后，优先检查 `providers` 字段：
   - 若存在且为数组，遍历每一项，校验 `name`、`protocol`、`base_url`、`api_key`、`model` 存在且非空。
   - 将 `base_url` / `api_key` 映射为 `baseUrl` / `apiKey`。
   - `thinking` 字段可选，缺失时默认 `false`。
3. 若 `providers` 不存在，回退读取旧格式字段 `protocol`、`model`、`base_url`、`api_key`，组装成单个 `ProviderItemConfig`。
4. 若新旧格式都无法得到任何 Provider，抛出 `ConfigError`。
5. 若 `providers` 数组存在但为空，抛出 `ConfigError`。
6. 校验 `protocol` 仅支持 `openai`（与第 1 章一致）。

**验证：** 写临时脚本分别测试：
- 多 Provider YAML 返回 `providers` 长度正确。
- 旧格式 YAML 返回单个 Provider 条目。
- 空数组、缺失字段、无新旧格式时均抛出 `ConfigError`。

## T3: 实现 Provider 解析器

**文件：** `src/config/resolver.ts`
**依赖：** T1
**步骤：**
1. 实现 `resolveProviderSelection(config: AppConfig): ProviderSelectionResult`。
2. 逻辑：
   - 若 `config.providers` 存在且非空，使用它作为 `items`。
   - 否则若旧格式字段完整，构造单个条目作为 `items`。
   - 否则 `items` 为空（理论上 `loadConfig` 已拦截，此处做防御）。
   - 当 `items.length === 1` 时，`selected = items[0]`，`needsSelection = false`。
   - 当 `items.length > 1` 时，`needsSelection = true`。
3. 保持函数纯函数，不依赖外部状态。

**验证：** 写临时脚本测试：
- 单 Provider AppConfig 返回 `needsSelection: false` 且 `selected` 正确。
- 多 Provider AppConfig 返回 `needsSelection: true` 且 `items` 完整。

## T4: 调整 Provider 工厂入参

**文件：** `src/provider/factory.ts`
**依赖：** T1
**步骤：**
1. 将 `createProvider` 的入参类型从 `ProviderConfig` 改为 `ProviderItemConfig`。
2. 当 `config.protocol === 'openai'` 时返回 `new OpenAIProvider(config)`。
3. 其他协议抛出清晰错误。

**验证：** `npm run build` 成功；临时脚本用单 Provider 配置调用返回 `protocol === 'openai'`。

## T5: 修改 OpenAI Provider 接收新配置

**文件：** `src/provider/openai.ts`
**依赖：** T1、T4
**步骤：**
1. 将构造函数入参类型改为 `ProviderItemConfig`。
2. 在创建 `OpenAI` 客户端时使用 `config.baseUrl` 与 `config.apiKey`。
3. 在 `stream` 方法中读取 `config.model`。
4. 读取 `config.thinking`：
   - 若 `thinking` 为 `true`，可在请求参数中保留 `stream_options: { include_usage: true }` 并确保 `reasoning_content` 相关字段被正确产出（当前 OpenAI SDK 已自动处理返回字段，无需额外参数即可接收 `reasoning_content`）。
   - 若 `thinking` 为 `false`，仍保持 `stream_options` 以获取 usage，但 Provider 配置中记录该标记。
5. 保留 `protocol = 'openai'`。

**验证：** `npm run build` 成功。

## T6: 实现 Provider 选择界面组件

**文件：** `src/tui/components/ProviderSelector.tsx`
**依赖：** T1
**步骤：**
1. 定义组件属性 `ProviderSelectorProps`，包含 `providers`、`onSelect`、`onCancel?`。
2. 使用 `useState` 维护当前高亮索引 `selectedIndex`，初始值为 `0`。
3. 使用 `useInput` 处理键盘：
   - `Ctrl+C`：调用 `useApp().exit()` 或 `onCancel?.()`。
   - `↑` / `↓`：调整 `selectedIndex`，边界循环或截断。
   - `Enter`：调用 `onSelect(providers[selectedIndex])`。
4. 渲染布局：
   - 顶部标题：`选择 Provider`。
   - 中间列表：每项显示 `name`、`protocol`、`model`；当前选中项使用反色或加粗高亮。
   - 底部提示：`↑/↓ 切换，Enter 确认，Ctrl+C 退出`。
5. 使用 `theme.ts` 中的颜色常量。

**验证：** `npm run build` 成功；写临时脚本用 `render(<ProviderSelector ... />)` 观察界面（可配合 `await instance.waitUntilExit()`）。

## T7: 调整 CLI 入口启动流程

**文件：** `src/index.ts`
**依赖：** T2、T3、T4、T6
**步骤：**
1. 导入 `resolveProviderSelection` 与 `ProviderSelector`。
2. 加载配置后调用 `resolveProviderSelection(config)`。
3. 若 `needsSelection` 为 `false`：
   - 使用 `result.selected` 调用 `createProvider`。
   - 渲染 `<App provider={provider} />`。
4. 若 `needsSelection` 为 `true`：
   - 渲染 `<ProviderSelector providers={result.items} onSelect={...} />`。
   - 在 `onSelect` 回调中创建 Provider 并渲染 `<App provider={provider} />`。
   - 注意：需要在选择组件外部等待 `onSelect` 完成，再进入 App 渲染。
5. 保持错误处理：配置加载失败仍以文本形式输出到 stderr。

**验证：** `npm run build` 成功。

## T8: 更新示例配置文件

**文件：** `.smcode/config.yaml`、`.smcode/config.example.yaml`
**依赖：** T2
**步骤：**
1. 将默认配置改为包含至少两个 Provider 的 `providers` 数组示例，便于验证选择界面。
2. 注释说明字段含义，包括 `name` 与 `thinking`。
3. 保留一个旧格式注释说明，便于后续向后兼容测试（可选）。

**验证：** 启动应用后能进入选择界面并看到两个 Provider。

## T9: 验证完整构建与多分支启动

**文件：** 全部
**依赖：** T1-T8
**步骤：**
1. 执行 `npm run build` 编译整个项目。
2. 确认 `out/` 目录生成新增/修改模块的 `.js` 与 `.d.ts`。
3. 使用多 Provider 配置执行 `npm start`，验证进入选择界面。
4. 使用单 Provider 配置执行 `npm start`，验证跳过选择界面直接进入对话。
5. 临时删除 `providers` 并保留旧格式字段，验证向后兼容。
6. 使用空数组配置验证错误提示。

**验证：** `npm run build` 无错误；三种配置场景均符合预期。

## 执行顺序

```
T1
│
├──→ T2  ──→ T3  ──┐
│                  │
├──→ T4  ──→ T5 ───┤
│                  │
└──→ T6  ──────────┤
                   │
                   ▼
              T7（CLI 入口串联）
                   │
                   ▼
              T8（示例配置）
                   │
                   ▼
              T9（构建与验证）
```
