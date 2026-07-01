/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : tui/utils/color.ts
 * Author     : sumu
 * Date       : 2026/07/01
 * Version    : 0.0.0
 * Description: 颜色插值工具（卡顿变红用，research.md §4.1）
 * ======================================================
 */

/** RGB 三元组 */
export interface RGB {
  /** 红色通道 0-255 */
  readonly r: number;
  /** 绿色通道 0-255 */
  readonly g: number;
  /** 蓝色通道 0-255 */
  readonly b: number;
}

/** smink 接受的 rgb() 颜色字符串类型 */
export type RgbColorString = `rgb(${number},${number},${number})`;

/** 卡顿变红目标色（对标 Claude Code ERROR_RED） */
export const ERROR_RED: RGB = { r: 171, g: 43, b: 63 };

/** 主题主色（Claude 珊瑚色，对标 Claude Code claude 色） */
export const PRIMARY_RGB: RGB = { r: 215, g: 119, b: 87 };

/**
 * 在两个 RGB 颜色之间按权重线性插值
 * @param from - 起始色
 * @param to - 目标色
 * @param t - 权重 0~1，0 返回 from、1 返回 to
 * @returns 插值后的 RGB
 */
export function interpolateColor(from: RGB, to: RGB, t: number): RGB {
  const clamp = (value: number): number => Math.max(0, Math.min(255, value));
  return {
    r: clamp(Math.round(from.r + (to.r - from.r) * t)),
    g: clamp(Math.round(from.g + (to.g - from.g) * t)),
    b: clamp(Math.round(from.b + (to.b - from.b) * t)),
  };
}

/**
 * 将 RGB 转为 smink 接受的 rgb() 字符串
 * @param color - RGB 三元组
 * @returns 形如 "rgb(r,g,b)" 的颜色字符串
 */
export function toRgbString(color: RGB): RgbColorString {
  return `rgb(${color.r},${color.g},${color.b})`;
}

/**
 * 按卡顿强度在主色与错误红之间插值
 * @param intensity - 卡顿强度 0~1
 * @returns 颜色字符串
 */
export function stallColor(intensity: number): RgbColorString {
  const clamped = Math.max(0, Math.min(1, intensity));
  return toRgbString(interpolateColor(PRIMARY_RGB, ERROR_RED, clamped));
}
