/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : provider/factory.ts
 * Author     : sumu
 * Date       : 2026/06/30
 * Version    : 0.0.0
 * Description: 根据配置创建对应 Provider 实例的工厂
 * ======================================================
 */

import type { ProviderConfig } from '../config/types.js';

import { OpenAIProvider } from './openai.js';
import type { Provider } from './types.js';

/**
 * 根据 protocol 创建 Provider 实例
 * @param config - Provider 配置
 * @returns Provider 实例
 * @throws {Error} 当 protocol 不受支持时抛出
 */
export function createProvider(config: ProviderConfig): Provider {
  if (config.protocol === 'openai') {
    return new OpenAIProvider(config);
  }

  throw new Error(`Unsupported protocol: ${config.protocol}`);
}
