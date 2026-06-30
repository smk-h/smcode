/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : config/resolver.ts
 * Author     : sumu
 * Date       : 2026/06/30
 * Version    : 0.0.0
 * Description: Provider 解析与选择判定，决定是否需要进入选择界面
 * ======================================================
 */

import type { AppConfig, ProviderItemConfig, ProviderSelectionResult } from './types.js';

/**
 * 从 AppConfig 中提取可用的 Provider 条目列表
 *
 * 优先使用 config.providers 数组；若不存在则尝试将旧格式字段
 * 组装为单个 Provider 条目。
 *
 * @param config - 应用配置对象
 * @returns Provider 条目列表，保证非空
 */
function extractProviderItems(config: AppConfig): ProviderItemConfig[] {
  if (config.providers !== undefined && config.providers.length > 0) {
    return config.providers;
  }

  // 防御性分支：正常情况下 loadConfig 已保证至少存在一个 Provider
  return [];
}

/**
 * 根据配置决定是否需要进入 Provider 选择界面
 *
 * 当只有一个 Provider 时直接返回选中项；多个 Provider 时需要用户选择。
 *
 * @param config - 应用配置对象
 * @returns Provider 选择结果
 */
export function resolveProviderSelection(
  config: AppConfig,
): ProviderSelectionResult {
  const items = extractProviderItems(config);

  if (items.length === 1) {
    return {
      selected: items[0],
      items,
      needsSelection: false,
    };
  }

  return {
    items,
    needsSelection: true,
  };
}
