/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : tui/constants/figures.ts
 * Author     : sumu
 * Date       : 2026/07/01
 * Version    : 0.0.0
 * Description: 消息前缀图标字符常量（对标 Claude Code figures.ts）
 * ======================================================
 */

/** 用户消息前缀：右尖角（figures.pointer，U+276F），中性灰 */
export const USER_POINTER = '❯';

/** 助手消息前缀：实心圆（BLACK_CIRCLE，U+25CF），亮前景 */
export const ASSISTANT_BULLET = '●';

/** 轮次完成态前缀：泪滴星号（TEARDROP_ASTERISK，U+273B），中性 dim 色 */
export const COMPLETION_ASTERISK = '✻';

/** 思考过程前缀（展开态）：因为符号（U+2234） */
export const THINKING_PREFIX = '∴';

/** 三个前缀图标共用的固定边沟宽度（字符占 1 格 + 留白 1 格） */
export const ICON_GUTTER_WIDTH = 2;
