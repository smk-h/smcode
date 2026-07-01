/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : tui/theme.ts
 * Author     : sumu
 * Date       : 2026/06/30
 * Version    : 0.0.0
 * Description: TUI 颜色与样式常量（Claude Code 风格）
 * ======================================================
 */

/** TUI 配色方案（对齐 Claude Code 暗色主题，主色调珊瑚/橙） */
export const theme = {
  /** 主色调：Claude Code 珊瑚/橙色（用于欢迎页边框、Clawd、处理中脉冲星号） */
  primary: 'rgb(215,119,87)',
  /** 用户消息气泡背景色（深灰，铺满整行） */
  userMessageBackground: 'ansi256(60)',
  /** 助手消息圆点色（亮前景，中性，不染橙） */
  assistantBullet: 'ansi:whiteBright',
  /** 用户消息前缀 ❯ 与完成态前缀 ✻ 的中性暗灰色 */
  subtle: 'ansi:blackBright',
  /** 思考过程文本色 */
  thinking: 'ansi256(153)',
  /** 暗淡提示颜色 */
  dim: 'ansi:blackBright',
  /** 欢迎页右侧 Feed 标题色（品牌橙加粗） */
  welcomeTipTitle: 'rgb(215,119,87)',
  /** 欢迎页边框色（与 primary 一致，单独命名便于后续微调） */
  welcomeBorder: 'rgb(215,119,87)',
  /** Clawd 吉祥物中段填充背景色（纯黑） */
  clawdBackground: 'rgb(0,0,0)',
  /** 处理中状态行文本色 */
  statusText: 'ansi:blueBright',
  /** 错误颜色（卡顿变红目标色） */
  error: 'ansi:red',
  /** 输入框边界线灰白色 */
  border: 'ansi256(60)',
  /** 兼容旧引用：用户消息标签颜色（保留，避免破坏既有引用） */
  user: 'ansi:green',
  /** 兼容旧引用：助手消息标签颜色（保留，避免破坏既有引用） */
  assistant: 'ansi:magenta',
} as const;
