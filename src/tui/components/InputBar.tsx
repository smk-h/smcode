/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : tui/components/InputBar.tsx
 * Author     : sumu
 * Date       : 2026/06/30
 * Version    : 0.0.0
 * Description: 底部输入框与状态栏组件
 * ======================================================
 */

import React, { memo } from 'react';
import { Box, Text } from '@smai-kit/smink';

import type { TokenUsage } from '../../provider/types.js';
import { theme } from '../theme.js';

/** InputBar 组件属性 */
export interface InputBarProps {
  /** 当前输入值 */
  value: string;
  /** 是否禁用输入（等待回复中） */
  disabled: boolean;
  /** 输入框占位提示 */
  placeholder?: string;
  /** 累计 token 用量 */
  tokenUsage: TokenUsage;
}

/**
 * 底部输入框与状态栏
 * @param props - 组件属性
 * @returns React 元素
 */
function InputBarComponent({
  value,
  disabled,
  placeholder,
  tokenUsage,
}: InputBarProps): React.JSX.Element {
  const defaultPlaceholder = disabled
    ? '等待回复中...'
    : '输入消息，按 Enter 发送';
  const inputPlaceholder = placeholder ?? defaultPlaceholder;

  return (
    <Box flexDirection="column" marginTop={1} flexShrink={0}>
      <Box
        borderStyle="round"
        borderColor={disabled ? theme.dim : theme.primary}
        paddingX={1}
      >
        <Text color={theme.primary} bold>
          {'❯ '}
        </Text>
        {value.length > 0 ? (
          <Text>
            {value}
            {'▎'}
          </Text>
        ) : (
          <>
            <Text color={theme.dim}>{inputPlaceholder}</Text>
            <Text color={theme.primary} inverse>
              {'▎'}
            </Text>
          </>
        )}
      </Box>

      <Box justifyContent="space-between" paddingX={1}>
        <Text color={theme.dim}>
          {tokenUsage.totalTokens > 0
            ? `prompt: ${tokenUsage.promptTokens}  completion: ${tokenUsage.completionTokens}  total: ${tokenUsage.totalTokens}`
            : ''}
        </Text>
        <Text color={theme.dim}>
          {disabled ? '等待回复中' : 'Enter 发送'}
        </Text>
      </Box>
    </Box>
  );
}

/** 底部输入框与状态栏（记忆化，减少流式输出时的重复渲染） */
export const InputBar = memo(InputBarComponent);
