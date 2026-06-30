/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : tui/theme.ts
 * Author     : sumu
 * Date       : 2026/06/30
 * Version    : 0.0.0
 * Description: TUI 颜色与样式常量
 * ======================================================
 */

/** TUI 配色方案 */
export const theme = {
  /** 主色调 */
  primary: 'ansi:cyan',
  /** 用户消息标签颜色 */
  user: 'ansi:green',
  /** 助手消息标签颜色 */
  assistant: 'ansi:magenta',
  /** 思考过程颜色 */
  thinking: 'ansi:yellow',
  /** 暗淡提示颜色 */
  dim: 'ansi:blackBright',
  /** 边框颜色 */
  border: 'ansi256(60)',
  /** 错误颜色 */
  error: 'ansi:red',
} as const;
