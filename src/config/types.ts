/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : config/types.ts
 * Author     : sumu
 * Date       : 2026/06/30
 * Version    : 0.0.0
 * Description: 配置模块类型定义
 * ======================================================
 */

/** YAML 配置在内存中的表示 */
export interface ProviderConfig {
  /** 后端协议，当前仅支持 openai */
  protocol: 'openai';
  /** 模型名称 */
  model: string;
  /** API 基础地址 */
  baseUrl: string;
  /** API 认证密钥 */
  apiKey: string;
}
