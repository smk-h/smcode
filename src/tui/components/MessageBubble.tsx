/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : tui/components/MessageBubble.tsx
 * Author     : sumu
 * Date       : 2026/06/30
 * Version    : 0.0.0
 * Description: 单条聊天消息气泡组件
 * ======================================================
 */

import React, { memo } from 'react';
import { Box, Text } from '@smai-kit/smink';

import type { ConversationMessage } from '../../conversation/types.js';
import { theme } from '../theme.js';

/** MessageBubble 组件属性 */
export interface MessageBubbleProps {
  /** 消息对象 */
  msg: ConversationMessage;
}

/**
 * 单条消息气泡
 * @param props - 组件属性
 * @returns React 元素
 */
function MessageBubbleComponent({ msg }: MessageBubbleProps): React.JSX.Element {
  const isUser = msg.role === 'user';
  const color = isUser ? theme.user : theme.assistant;
  const label = isUser ? '你' : 'AI';
  const icon = isUser ? '▸' : '◆';

  return (
    <Box flexDirection="column" marginY={0}>
      <Box gap={1}>
        <Text color={color} bold>
          {icon} {label}
        </Text>
        {msg.streaming && (
          <Text color={theme.thinking}>思考中...</Text>
        )}
      </Box>

      {!isUser && msg.thinking && msg.thinking.length > 0 && (
        <Box marginLeft={2} flexDirection="column">
          <Text color={theme.thinking} dim>
            思考: {msg.thinking}
          </Text>
        </Box>
      )}

      <Box marginLeft={2} flexDirection="column">
        <Text>{msg.content || (msg.streaming ? '...' : '')}</Text>
      </Box>
    </Box>
  );
}

/** 单条消息气泡（记忆化，避免未变化的消息重复渲染） */
export const MessageBubble = memo(MessageBubbleComponent);
