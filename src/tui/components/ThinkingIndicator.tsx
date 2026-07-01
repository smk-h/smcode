/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : tui/components/ThinkingIndicator.tsx
 * Author     : sumu
 * Date       : 2026/07/01
 * Version    : 0.0.0
 * Description: 思考过程折叠/展开指示器（独立成行，前缀与 ● 圆点左对齐）
 * ======================================================
 */

import React, { memo } from 'react';
import { Box, Text } from '@smai-kit/smink';

import { THINKING_PREFIX, ICON_GUTTER_WIDTH } from '../constants/figures.js';
import { theme } from '../theme.js';

/** ThinkingIndicator 组件属性 */
export interface ThinkingIndicatorProps {
  /** 已耗时（秒） */
  elapsedSeconds: number;
  /** 是否展开思考文本 */
  expanded: boolean;
  /** 思考过程文本（展开时显示） */
  thinking?: string;
  /** 切换展开/折叠的回调 */
  onToggle: () => void;
}

/**
 * 思考过程折叠/展开指示器
 *
 * 折叠态显示 `Thinking for Xs (ctrl+o to expand)`，前缀以空格占位（无 ∴）；
 * 展开态以 ∴ 为前缀显示完整思考文本。前缀（∴ 或占位空格）顶格，与下方
 * 助手 ● 圆点左对齐（同一列）；思考行前不重复 ● 圆点。
 *
 * @param props - 组件属性
 * @returns React 元素
 */
function ThinkingIndicatorComponent({
  elapsedSeconds,
  expanded,
  thinking,
  onToggle,
}: ThinkingIndicatorProps): React.JSX.Element {
  const prefix = expanded ? THINKING_PREFIX : ' ';

  return (
    <Box flexDirection="column">
      {/* 折叠态提示行：前缀空格占位（与 ● 左对齐） */}
      {!expanded && (
        <Box flexDirection="row">
          <Box width={ICON_GUTTER_WIDTH} flexShrink={0}>
            <Text color={theme.dim}>{prefix}</Text>
          </Box>
          <Text color={theme.dim} italic>
            {`Thinking for ${elapsedSeconds}s (ctrl+o to expand)`}
          </Text>
        </Box>
      )}

      {/* 展开态：完整思考文本，前缀 ∴ 顶格 */}
      {expanded && thinking && (
        <Box flexDirection="row">
          <Box width={ICON_GUTTER_WIDTH} flexShrink={0}>
            <Text color={theme.dim}>{prefix}</Text>
          </Box>
          <Box flexDirection="column" flexGrow={1}>
            <Text
              color={theme.thinking}
              italic
              onClick={onToggle}
            >
              {thinking}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}

/** 思考过程指示器（记忆化） */
export const ThinkingIndicator = memo(ThinkingIndicatorComponent);
