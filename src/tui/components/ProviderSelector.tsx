/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : tui/components/ProviderSelector.tsx
 * Author     : sumu
 * Date       : 2026/06/30
 * Version    : 0.0.0
 * Description: 基于 smink 的 Provider 选择界面组件
 * ======================================================
 */

import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from '@smai-kit/smink';

import type { ProviderItemConfig } from '../../config/types.js';
import { theme } from '../theme.js';

/** ProviderSelector 组件属性 */
export interface ProviderSelectorProps {
  /** 可供选择的 Provider 列表 */
  providers: readonly ProviderItemConfig[];
  /** 用户确认选择后的回调 */
  onSelect: (provider: ProviderItemConfig) => void;
  /** 用户取消选择后的回调 */
  onCancel?: () => void;
}

/**
 * Provider 选择界面
 *
 * 展示所有可用 Provider，支持上下方向键切换高亮，Enter 确认，Ctrl+C 退出。
 *
 * @param props - 组件属性
 * @returns React 元素
 */
export function ProviderSelector({
  providers,
  onSelect,
  onCancel,
}: ProviderSelectorProps): React.JSX.Element {
  const { exit } = useApp();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      onCancel?.();
      exit();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((previous) => (previous > 0 ? previous - 1 : providers.length - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((previous) => (previous < providers.length - 1 ? previous + 1 : 0));
      return;
    }

    if (key.return) {
      onSelect(providers[selectedIndex]);
      exit();
      return;
    }
  });

  return (
    <Box flexDirection="column" height="100%" padding={1}>
      <Box
        borderStyle="bold"
        borderColor={theme.primary}
        paddingX={1}
        justifyContent="center"
      >
        <Text color={theme.primary} bold>
          选择 Provider
        </Text>
      </Box>

      <Box
        flexDirection="column"
        flexGrow={1}
        borderStyle="single"
        borderColor={theme.border}
        marginTop={1}
        paddingY={1}
      >
        {providers.map((provider, index) => {
          const isSelected = index === selectedIndex;
          return (
            <Box key={provider.name} paddingX={1}>
              <Text color={theme.primary} bold>
                {isSelected ? '❯' : ' '}
              </Text>
              <Box
                flexDirection="column"
                marginLeft={1}
                paddingX={1}
                width="100%"
              >
                <Text bold={isSelected} inverse={isSelected}>
                  {provider.name}
                </Text>
                <Text color={theme.dim}>
                  {provider.model} ({provider.protocol})
                </Text>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box justifyContent="center" paddingX={1} marginTop={1}>
        <Text color={theme.dim}>
          ↑/↓ 切换，Enter 确认，Ctrl+C 退出
        </Text>
      </Box>
    </Box>
  );
}
