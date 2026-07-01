/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : tui/components/UserMessage.tsx
 * Author     : sumu
 * Date       : 2026/07/01
 * Version    : 0.0.0
 * Description: 用户消息气泡（深色背景 + ❯ 提示符，对齐 Claude Code）
 * ======================================================
 */

import React, { memo } from 'react';
import { Box, Text } from '@smai-kit/smink';

import { USER_POINTER, ICON_GUTTER_WIDTH } from '../constants/figures.js';
import { theme } from '../theme.js';

/** UserMessage 组件属性 */
export interface UserMessageProps {
  /** 用户输入的完整文本 */
  content: string;
}

/**
 * 用户消息气泡
 *
 * 深色背景铺满整行，左侧 ❯ 提示符（中性灰、不染橙）放入固定 2 字符宽边沟，
 * 与助手消息 ●、完成态 ✻ 落在同一垂直列（详见 research.md 附录 D）。
 *
 * @param props - 组件属性
 * @returns React 元素
 */
function UserMessageComponent({ content }: UserMessageProps): React.JSX.Element {
  return (
    <Box
      flexDirection="row"
      alignItems="flex-start"
      width="100%"
      backgroundColor={theme.userMessageBackground}
    >
      {/* 2 字符边沟：❯ 占 1 格 + 1 格留白 */}
      <Box width={ICON_GUTTER_WIDTH} flexShrink={0}>
        <Text color={theme.subtle}>{USER_POINTER}</Text>
      </Box>
      <Box flexDirection="column" flexGrow={1} paddingRight={1}>
        <Text>{content}</Text>
      </Box>
    </Box>
  );
}

/** 用户消息气泡（记忆化，避免未变化的消息重复渲染） */
export const UserMessage = memo(UserMessageComponent);
