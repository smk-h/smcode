/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : config/loader.ts
 * Author     : sumu
 * Date       : 2026/06/30
 * Version    : 0.0.0
 * Description: YAML 配置文件加载与校验
 * ======================================================
 */

import { readFileSync } from 'node:fs';

import { load } from 'js-yaml';

import type { ProviderConfig } from './types.js';

/** 配置加载过程中出现的错误 */
export class ConfigError extends Error {
  /**
   * @param message - 错误描述
   * @param filePath - 发生错误的配置文件路径
   */
  constructor(message: string, public readonly filePath: string) {
    super(`${message} (${filePath})`);
    this.name = 'ConfigError';
  }
}

/**
 * 从 YAML 文件加载并校验 Provider 配置
 * @param filePath - YAML 配置文件路径
 * @returns 校验后的 ProviderConfig 对象
 * @throws {ConfigError} 当文件不存在、解析失败或字段缺失时抛出
 */
export function loadConfig(filePath: string): ProviderConfig {
  let rawContent: string;
  try {
    rawContent = readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new ConfigError('无法读取配置文件', filePath);
  }

  let parsed: unknown;
  try {
    parsed = load(rawContent);
  } catch (error) {
    throw new ConfigError('YAML 解析失败', filePath);
  }

  if (parsed === null || typeof parsed !== 'object') {
    throw new ConfigError('配置文件内容应为对象', filePath);
  }

  const record = parsed as Record<string, unknown>;

  const protocol = record.protocol;
  const model = record.model;
  const baseUrl = record.base_url;
  const apiKey = record.api_key;

  if (typeof protocol !== 'string' || protocol.trim() === '') {
    throw new ConfigError('缺少必填字段 protocol', filePath);
  }
  if (typeof model !== 'string' || model.trim() === '') {
    throw new ConfigError('缺少必填字段 model', filePath);
  }
  if (typeof baseUrl !== 'string' || baseUrl.trim() === '') {
    throw new ConfigError('缺少必填字段 base_url', filePath);
  }
  if (typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new ConfigError('缺少必填字段 api_key', filePath);
  }

  if (protocol !== 'openai') {
    throw new ConfigError(`不支持的 protocol: ${protocol}`, filePath);
  }

  return {
    protocol,
    model,
    baseUrl,
    apiKey,
  };
}
