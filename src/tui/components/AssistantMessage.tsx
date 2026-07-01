/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : tui/components/AssistantMessage.tsx
 * Author     : sumu
 * Date       : 2026/07/01
 * Version    : 0.0.0
 * Description: 助手消息（思考过程 + ● 圆点 + 内容，对齐 Claude Code）
 * ======================================================
 */

import React, { memo } from 'react';
import { Box, Text } from '@smai-kit/smink';

import {
  ASSISTANT_BULLET,
  COMPLETION_ASTERISK,
  ICON_GUTTER_WIDTH,
} from '../constants/figures.js';
import { theme } from '../theme.js';
import { ThinkingIndicator, type ThinkingIndicatorProps } from './ThinkingIndicator.js';

/** AssistantMessage 组件属性 */
export interface AssistantMessageProps {
  /** 助手回复正文 */
  content: string;
  /** 思考过程文本（可选） */
  thinking?: string;
  /** 思考是否展开 */
  expanded?: boolean;
  /** 切换思考展开/折叠的回调 */
  onToggleThinking?: () => void;
  /** 是否仍在流式接收中 */
  streaming?: boolean;
  /** 完成态文本（轮次结束时，如 "Brewed for 7s"） */
  completionText?: string;
}

/**
 * 对正文做基础 Markdown 格化（列表前加 -、代码块反引号包裹并换行）
 * @param content - 原始正文
 * @returns 行数组
 */
function formatContent(content: string): readonly string[] {
  if (!content) {
    return [];
  }
  return content.split('\n');
}

/**
 * 助手消息组件
 *
 * 若存在 thinking，先在顶部独立渲染一行 ThinkingIndicator（顶格、与下方
 * ● 圆点左对齐，思考行前不重复 ●）。其下是 ● 圆点行（2 字符边沟）+ 内容区。
 * 轮次结束时由 completionText 渲染完成态行（✻ 前缀，与 ❯/● 同列）。
 *
 * @param props - 组件属性
 * @returns React 元素
 */
function AssistantMessageComponent({
  content,
  thinking,
  expanded,
  onToggleThinking,
  streaming,
  completionText,
}: AssistantMessageProps): React.JSX.Element {
  const hasThinking = thinking !== undefined && thinking.length > 0;
  const indicatorProps: ThinkingIndicatorProps | null =
    hasThinking && onToggleThinking
      ? {
          elapsedSeconds: 0,
          expanded: expanded ?? false,
          thinking,
          onToggle: onToggleThinking,
        }
      : null;

  return (
    <Box flexDirection="column" width="100%">
      {/* 思考指示器：独立成行，渲染在 ● 圆点行之前 */}
      {indicatorProps && <ThinkingIndicator {...indicatorProps} />}

      {/* ● 圆点行：2 字符边沟 + 内容区 */}
      <Box flexDirection="row" alignItems="flex-start" width="100%">
        <Box width={ICON_GUTTER_WIDTH} flexShrink={0}>
          <Text color={theme.assistantBullet}>{ASSISTANT_BULLET}</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1} paddingRight={1}>
          {content ? (
            formatContent(content).map((line, index) => (
              <Text key={index}>{line}</Text>
            ))
          ) : streaming ? (
            <Text color={theme.dim}>...</Text>
          ) : null}
        </Box>
      </Box>

      {/* 完成态行：✻ 前缀与 ❯/● 同列 */}
      {completionText && (
        <Box flexDirection="row" alignItems="flex-start" width="100%">
          <Box width={ICON_GUTTER_WIDTH} flexShrink={0}>
            <Text color={theme.dim}>{COMPLETION_ASTERISK}</Text>
          </Box>
          <Text color={theme.dim}>{completionText}</Text>
        </Box>
      )}
    </Box>
  );
}

/** 助手消息（记忆化） */
export const AssistantMessage = memo(AssistantMessageComponent);
