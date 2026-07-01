/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : tui/components/StatusIndicator.tsx
 * Author     : sumu
 * Date       : 2026/07/01
 * Version    : 0.0.0
 * Description: 处理中动态提示行（F8–F8e，独占动画时钟，research.md）
 * ======================================================
 */

import React, { memo, useRef } from 'react';
import { Box, Text, useAnimationFrame } from '@smai-kit/smink';

import {
  SPINNER_FRAME_MS,
  ANIMATION_TICK_MS,
  STALL_THRESHOLD_MS,
  STALL_RAMP_MS,
  SHOW_TOKENS_AFTER_MS,
  CHARS_PER_TOKEN,
} from '../constants/spinner.js';
import { ICON_GUTTER_WIDTH } from '../constants/figures.js';
import { SpinnerGlyph } from './SpinnerGlyph.js';
import { stallColor } from '../utils/color.js';
import { theme } from '../theme.js';

/** 思考状态机：thinking / 思考时长(ms) / null（research.md §5） */
export type ThinkingStatus = 'thinking' | number | null;

/** StatusIndicator 组件属性 */
export interface StatusIndicatorProps {
  /** 当前动作文本（如 "Cogitating…"），来自动词池随机选取或任务进行式覆盖 */
  verb: string;
  /** 已耗时（秒） */
  elapsedSeconds: number;
  /** 已接收 token 数（真实值，组件内部缓动追赶） */
  tokenCount: number;
  /** 思考状态 */
  thinkingStatus: ThinkingStatus;
  /** 是否有新内容流入，用于卡顿检测复位（true 复位计时） */
  isStreaming: boolean;
  /** 终端列数，用于各段逐级降级 */
  columns: number;
  /** 响应开始至今累计毫秒数（用于 token 显示门槛） */
  elapsedMs: number;
}

/**
 * 计算 token 平滑追赶的显示值
 * @param displayed - 当前显示值
 * @param target - 真实目标值
 * @returns 新的显示值
 */
function smoothTokens(displayed: number, target: number): number {
  const gap = target - displayed;
  if (gap <= 0) {
    return target;
  }
  // 差距越大步长越大（research.md §7）
  let increment: number;
  if (gap < 70) {
    increment = 3;
  } else if (gap < 200) {
    increment = Math.max(8, Math.ceil(gap * 0.15));
  } else {
    increment = 50;
  }
  return Math.min(displayed + increment, target);
}

/**
 * 处理中动态提示行
 *
 * 独占动画时钟（useAnimationFrame），所有随时间变化的量都在本组件内派生，
 * 不污染消息列表与输入框。渲染「动态图标 + 动词 + 括号状态段」，括号内按
 * 终端宽度逐级降级显示 thinking / 耗时 / token。
 *
 * @param props - 组件属性
 * @returns React 元素
 */
function StatusIndicatorComponent({
  verb,
  elapsedSeconds,
  tokenCount,
  thinkingStatus,
  isStreaming,
  columns,
  elapsedMs,
}: StatusIndicatorProps): React.JSX.Element {
  // 动画时钟：50ms 触发一次重渲染
  const [ref, time] = useAnimationFrame(ANIMATION_TICK_MS);

  // 卡顿检测：记录上次流入时间
  const lastStreamRef = useRef<number>(time);
  if (isStreaming) {
    lastStreamRef.current = time;
  }
  const sinceLastStream = time - lastStreamRef.current;

  // 卡顿强度：超过阈值后线性增长至 1（research.md §4.1）
  let stalledIntensity = 0;
  if (sinceLastStream > STALL_THRESHOLD_MS) {
    stalledIntensity = Math.min(
      (sinceLastStream - STALL_THRESHOLD_MS) / STALL_RAMP_MS,
      1,
    );
  }

  // token 平滑计数：缓动追赶真实值
  const tokenDisplayRef = useRef<number>(0);
  tokenDisplayRef.current = smoothTokens(tokenDisplayRef.current, tokenCount);
  const leaderTokens = Math.round(tokenDisplayRef.current / CHARS_PER_TOKEN);

  // 图标帧号（research.md §2.3）
  const frame = Math.floor(time / SPINNER_FRAME_MS);

  // 动词颜色随卡顿向红插值
  const verbColor =
    stalledIntensity > 0 ? stallColor(stalledIntensity) : theme.primary;

  // 状态段文本：thinking / thought for Ns（research.md §5）
  let thinkingText = '';
  if (thinkingStatus === 'thinking') {
    thinkingText = 'thinking';
  } else if (typeof thinkingStatus === 'number') {
    thinkingText = `thought for ${Math.round(thinkingStatus / 1000)}s`;
  }

  // 逐级降级：动词 > thinking > 计时 > token（research.md §6）
  const messageWidth = `${verb}…`.length;
  const availableSpace = columns - ICON_GUTTER_WIDTH - messageWidth - 5;
  const timerText = `${elapsedSeconds}s`;
  const tokensText = `↓ ${leaderTokens} tokens`;

  const showThinking =
    thinkingText.length > 0 && availableSpace > thinkingText.length;
  const usedAfterThinking = showThinking ? thinkingText.length + 3 : 0;

  const showTimer = availableSpace > usedAfterThinking + timerText.length;
  const usedAfterTimer = showTimer ? timerText.length + 3 : 0;

  const showTokens =
    elapsedMs > SHOW_TOKENS_AFTER_MS &&
    availableSpace > usedAfterThinking + usedAfterTimer + tokensText.length;

  // 拼装括号内各段（顺序：计时 · token · thinking）
  const segments: string[] = [];
  if (showTimer) {
    segments.push(timerText);
  }
  if (showTokens) {
    segments.push(tokensText);
  }
  if (showThinking) {
    segments.push(thinkingText);
  }
  const statusPart = segments.length > 0 ? ` (${segments.join(' · ')})` : '';

  return (
    <Box flexDirection="row" alignItems="flex-start" width="100%" ref={ref}>
      <SpinnerGlyph frame={frame} stalledIntensity={stalledIntensity} />
      <Box flexDirection="row" flexGrow={1} paddingRight={1}>
        <Text color={verbColor}>{`${verb}…`}</Text>
        <Text color={theme.dim}>{statusPart}</Text>
      </Box>
    </Box>
  );
}

/** 处理中动态提示行（记忆化） */
export const StatusIndicator = memo(StatusIndicatorComponent);
