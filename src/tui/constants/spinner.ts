/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : tui/constants/spinner.ts
 * Author     : sumu
 * Date       : 2026/07/01
 * Version    : 0.0.0
 * Description: 处理中动态提示行的图标帧序列与动词池
 *              （依据 research.md，对标 Claude Code Spinner）
 * ======================================================
 */

/**
 * 按平台返回视觉权重递增的图标字符序列（对标 Claude Code getDefaultCharacters）
 *
 * `✳`（U+2733）在 Windows/Linux 的常见终端字体下无法渲染，会显示为占位方框（tofu），
 * 故在非 macOS 平台用 ASCII `*` 替代（research.md §2.1）。
 * @returns 平台适配的字符序列
 */
function getDefaultCharacters(): string[] {
  return process.platform === 'darwin'
    ? ['·', '✢', '✳', '✶', '✻', '✽']
    : ['·', '✢', '*', '✶', '✻', '✽'];
}

/** 视觉权重递增的图标字符序列（research.md §2.1，按平台适配） */
export const SPINNER_CHARACTERS: readonly string[] = getDefaultCharacters();

/** 呼吸波形帧序列：正序 + 反序 = 12 帧（research.md §2.2） */
export const SPINNER_FRAMES: readonly string[] = [
  ...SPINNER_CHARACTERS,
  ...[...SPINNER_CHARACTERS].reverse(),
];

/** 图标单帧切换间隔（ms，research.md §2.3） */
export const SPINNER_FRAME_MS = 120;

/** 动画时钟刷新间隔（ms，research.md §1，约 20fps） */
export const ANIMATION_TICK_MS = 50;

/** 判定卡顿的阈值：自上次内容流入后的毫秒数（research.md §4.1） */
export const STALL_THRESHOLD_MS = 3000;

/** 卡顿强度从 0 渐变到 1 所需的额外毫秒数（research.md §4.1） */
export const STALL_RAMP_MS = 2000;

/** token 计数显示门槛：超过该时长才开始显示 token（research.md §6） */
export const SHOW_TOKENS_AFTER_MS = 30_000;

/** 约 4 字符 ≈ 1 token 的经验估算（research.md §7） */
export const CHARS_PER_TOKEN = 4;

/** 进行式动词池：每轮随机选一个，可被任务进行式覆盖（research.md §3.1） */
export const SPINNER_VERBS: readonly string[] = [
  'Thinking',
  'Doing',
  'Cogitating',
  'Pondering',
  'Brewing',
  'Considering',
  'Contemplating',
  'Crunching',
  'Deliberating',
  'Imagining',
  'Mulling',
  'Processing',
  'Ruminating',
  'Simmering',
  'Vibing',
  'Working',
  'Zigzagging',
  'Accomplishing',
  'Cerebrating',
  'Forgifying',
] as const;

/** 完成式动词池：轮次结束时配合 "for Xs" 展示（research.md §3.3） */
export const TURN_COMPLETION_VERBS: readonly string[] = [
  'Baked',
  'Brewed',
  'Churned',
  'Cogitated',
  'Cooked',
  'Crunched',
  'Sautéed',
  'Worked',
] as const;
