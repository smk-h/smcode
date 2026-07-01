/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : tui/components/InputBar.tsx
 * Author     : sumu
 * Date       : 2026/07/01
 * Version    : 0.0.0
 * Description: 底部输入框（上下灰白边界线 + ❯ 提示符 + 快捷提示）
 *              （对齐 Claude Code，F9/F10）
 * ======================================================
 */

import React, { memo } from 'react';
import { Box, Text } from '@smai-kit/smink';

import { USER_POINTER } from '../constants/figures.js';
import { theme } from '../theme.js';

/** InputBar 组件属性 */
export interface InputBarProps {
  /** 当前输入值 */
  value: string;
  /** 是否禁用输入（等待回复中） */
  disabled: boolean;
  /** 输入框占位提示 */
  placeholder?: string;
  /** 底部左侧快捷键提示 */
  shortcutHint?: string;
}

/**
 * 底部输入框与快捷提示
 *
 * 上下两条灰白边界线（single 样式，theme.dim），左侧显示 ❯ 提示符，
 * 占位符提示输入内容。下方左侧显示快捷键提示，右侧显示发送/等待状态。
 *
 * @param props - 组件属性
 * @returns React 元素
 */
function InputBarComponent({
  value,
  disabled,
  placeholder,
  shortcutHint,
}: InputBarProps): React.JSX.Element {
  const defaultPlaceholder = disabled
    ? '等待回复中...'
    : '输入消息，按 Enter 发送';
  const inputPlaceholder = placeholder ?? defaultPlaceholder;
  const hint = shortcutHint ?? '? for shortcuts';

  return (
    <Box flexDirection="column" marginTop={1} flexShrink={0}>
      {/* 输入框：上下两条灰白边界线（无左右边框） */}
      <Box
        borderTop
        borderBottom
        borderLeft={false}
        borderRight={false}
        borderStyle="single"
        borderColor={theme.dim}
        paddingX={0}
      >
        <Text color={theme.subtle}>{`${USER_POINTER} `}</Text>
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

      {/* 底部快捷提示：左侧快捷键，右侧发送/等待状态 */}
      <Box justifyContent="space-between" paddingX={1}>
        <Text color={theme.dim}>{hint}</Text>
        <Text color={theme.dim}>
          {disabled ? 'esc to interrupt' : 'Enter 发送'}
        </Text>
      </Box>
    </Box>
  );
}

/** 底部输入框与快捷提示（记忆化，减少流式输出时的重复渲染） */
export const InputBar = memo(InputBarComponent);
