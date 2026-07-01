/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : tui/components/WelcomeScreen.tsx
 * Author     : sumu
 * Date       : 2026/07/01
 * Version    : 0.0.0
 * Description: 常驻顶部欢迎主卡（圆角边框，对齐 Claude Code LogoV2）
 * ======================================================
 */

import React from 'react';
import { Box, Text } from '@smai-kit/smink';

import { Clawd } from './Clawd.js';
import { theme } from '../theme.js';

/** WelcomeScreen 组件属性 */
export interface WelcomeScreenProps {
  /** 版本号（运行时从 package.json 读取） */
  version: string;
  /** 当前模型名称 */
  modelName: string;
  /** 当前 Provider 名称 */
  providerName: string;
  /** 当前工作目录 */
  cwd: string;
}

/** 入门提示硬编码常量 */
const TIPS: readonly string[] = [
  'Try asking about your code',
  'Ask to run tests or scripts',
  'Use /help to see commands',
];

/** 更新动态硬编码常量 */
const WHATS_NEW: readonly string[] = [
  'Claude Code 风格界面',
  '多 Provider 切换',
  '流式思考过程展示',
];

/** 左列最大宽度上限（对标 Claude Code MAX_LEFT_WIDTH = 50） */
const MAX_LEFT_WIDTH = 50;

/**
 * 计算左列最优宽度（各文本宽度取最小需要值，上限 MAX_LEFT_WIDTH）
 * @param welcome - 欢迎语文本
 * @param cwd - 当前工作目录
 * @param modelLine - 模型·Provider 文本
 * @returns 左列宽度
 */
function calculateLeftWidth(
  welcome: string,
  cwd: string,
  modelLine: string,
): number {
  const minContent = Math.max(welcome.length, cwd.length, modelLine.length, 20);
  return Math.min(minContent + 4, MAX_LEFT_WIDTH);
}

/**
 * 渲染跨右列全宽的水平分隔线（对标 Claude Code Divider）
 *
 * 用一个 width="100%" 的 borderBottom 盒子画出一条横线，自动延伸到右列右边界
 * （即欢迎卡右边框内侧），无需手动计算列数。
 * @returns React 元素
 */
function renderDivider(): React.JSX.Element {
  return (
    <Box
      width="100%"
      borderStyle="bold"
      borderColor={theme.primary}
      borderDimColor
      borderBottom
      borderTop={false}
      borderLeft={false}
      borderRight={false}
    >
      <Text>{' '}</Text>
    </Box>
  );
}

/**
 * 渲染单个 Feed 分区
 * @param title - 标题（品牌橙加粗）
 * @param lines - 条目列表（· 前缀 + 暗灰）
 * @returns React 元素
 */
function renderFeed(
  title: string,
  lines: readonly string[],
): React.JSX.Element {
  return (
    <Box flexDirection="column">
      <Text color={theme.welcomeTipTitle} bold>
        {title}
      </Text>
      {lines.map((line) => (
        <Text key={line} color={theme.dim}>
          {`· ${line}`}
        </Text>
      ))}
    </Box>
  );
}

/**
 * 常驻顶部欢迎主卡
 *
 * 圆角边框 + borderText 标题（smcode 品牌橙 + 版本灰），
 * 左列展示 Welcome back / Clawd / 模型·Provider / 当前目录，
 * 右列展示两个 Feed（Tips / What's new），中间以橙色竖线分隔。
 *
 * @param props - 组件属性
 * @returns React 元素
 */
export function WelcomeScreen({
  version,
  modelName,
  providerName,
  cwd,
}: WelcomeScreenProps): React.JSX.Element {
  const welcome = 'Welcome back!';
  const modelLine = `${modelName} · ${providerName}`;
  const leftWidth = calculateLeftWidth(welcome, cwd, modelLine);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.welcomeBorder}
      borderText={{
        content: ` smcode v${version} `,
        position: 'top',
        align: 'start',
        offset: 3,
      }}
      paddingX={1}
      flexShrink={0}
    >
      <Box flexDirection="row">
        {/* 左列：欢迎语 / Clawd / 模型·Provider / 当前目录 */}
        <Box flexDirection="column" width={leftWidth} alignItems="flex-start">
          <Text color={theme.dim}>{welcome}</Text>
          <Clawd />
          <Text color={theme.dim}>{modelLine}</Text>
          <Text color={theme.dim}>{cwd}</Text>
        </Box>

        {/* 竖线分隔：仅 borderLeft + borderDimColor */}
        <Box
          borderStyle="single"
          borderColor={theme.primary}
          borderDimColor
          borderLeft
          borderRight={false}
          borderTop={false}
          borderBottom={false}
        />

        {/* 右列：两个 Feed，中间以橙色横线分隔（对标 Claude Code FeedColumn + Divider） */}
        <Box flexDirection="column" flexGrow={1} paddingLeft={1}>
          {(() => {
            const feeds = [
              { title: 'Tips for getting started', lines: TIPS },
              { title: "What's new", lines: WHATS_NEW },
            ];
            return feeds.map((feed, index) => (
              <React.Fragment key={feed.title}>
                {renderFeed(feed.title, feed.lines)}
                {index < feeds.length - 1 && renderDivider()}
              </React.Fragment>
            ));
          })()}
        </Box>
      </Box>
    </Box>
  );
}
