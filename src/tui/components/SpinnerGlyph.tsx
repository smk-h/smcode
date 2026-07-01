/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : tui/components/SpinnerGlyph.tsx
 * Author     : sumu
 * Date       : 2026/07/01
 * Version    : 0.0.0
 * Description: 图标字符呼吸脉冲 + 卡顿变红（F8a/F8d，research.md §2、§4.1）
 * ======================================================
 */

import React, { memo } from 'react';
import { Box, Text } from '@smai-kit/smink';

import { SPINNER_FRAMES } from '../constants/spinner.js';
import { ICON_GUTTER_WIDTH } from '../constants/figures.js';
import { stallColor } from '../utils/color.js';
import { theme } from '../theme.js';

/** SpinnerGlyph 组件属性 */
export interface SpinnerGlyphProps {
  /** 当前帧序号 */
  frame: number;
  /** 卡顿强度 0~1；0 为正常主色，>0 时向红色插值 */
  stalledIntensity: number;
}

/**
 * 图标字符呼吸脉冲 + 卡顿变红
 *
 * 从 SPINNER_FRAMES 按 frame 取字符，放进固定宽度边沟（与 ❯/●/✻ 同列），
 * 避免不同字符宽度差异导致抖动。颜色按卡顿强度在主色与红色间线性插值。
 *
 * @param props - 组件属性
 * @returns React 元素
 */
function SpinnerGlyphComponent({
  frame,
  stalledIntensity,
}: SpinnerGlyphProps): React.JSX.Element {
  const spinnerChar = SPINNER_FRAMES[frame % SPINNER_FRAMES.length];
  // 卡顿强度 > 0 时向红色插值；否则用主题主色
  const color =
    stalledIntensity > 0 ? stallColor(stalledIntensity) : theme.primary;

  return (
    <Box width={ICON_GUTTER_WIDTH} flexShrink={0}>
      <Text color={color}>{spinnerChar}</Text>
    </Box>
  );
}

/** 图标脉冲（记忆化，仅 frame/stalledIntensity 变化时重渲染） */
export const SpinnerGlyph = memo(SpinnerGlyphComponent);
