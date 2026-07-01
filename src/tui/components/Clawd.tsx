/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : tui/components/Clawd.tsx
 * Author     : sumu
 * Date       : 2026/07/01
 * Version    : 0.0.0
 * Description: Clawd 吉祥物（9×3 ASCII 方块小兽，复刻 Claude Code LogoV2）
 * ======================================================
 */

import React from 'react';
import { Box, Text } from '@smai-kit/smink';

import { theme } from '../theme.js';

/**
 * 单行像素描述：左/右两侧字符 + 中段是否填充背景。
 * 主体中段用 clawdBackground（纯黑）填充，两侧用 primary 无背景。
 */
interface ClawdRow {
  /** 左侧字符（primary 色，无背景） */
  readonly left: string;
  /** 中段字符（primary 色 + clawdBackground 背景） */
  readonly middle: string;
  /** 右侧字符（primary 色，无背景） */
  readonly right: string;
}

/** default 姿态的三行像素布局（对标 Claude Code Clawd.tsx） */
const CLAWD_ROWS: readonly ClawdRow[] = [
  { left: ' ▐▛', middle: '███', right: '▜▌' },
  { left: '▝▜', middle: '█████', right: '▛▘' },
  { left: '  ', middle: '▘▘ ▝▝', right: '  ' },
];

/**
 * Clawd 吉祥物组件
 *
 * 复刻 Claude Code 欢迎页的 Clawd：9 列宽、3 行高的方块小兽。
 * 主体中段以纯黑背景填充，整体染品牌橙。
 *
 * @returns React 元素
 */
export function Clawd(): React.JSX.Element {
  return (
    <Box flexDirection="column">
      {CLAWD_ROWS.map((row, index) => (
        <Box key={index} flexDirection="row">
          <Text color={theme.primary}>{row.left}</Text>
          <Text color={theme.primary} backgroundColor={theme.clawdBackground}>
            {row.middle}
          </Text>
          <Text color={theme.primary}>{row.right}</Text>
        </Box>
      ))}
    </Box>
  );
}
