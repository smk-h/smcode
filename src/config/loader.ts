/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : config/loader.ts
 * Author     : sumu
 * Date       : 2026/06/30
 * Version    : 0.0.0
 * Description: YAML 配置文件加载与校验，支持多 Provider 与旧格式兼容
 * ======================================================
 */

import { readFileSync } from 'node:fs';

import { load } from 'js-yaml';

import type { AppConfig, ProviderItemConfig } from './types.js';

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
 * 校验并转换单个 Provider 条目
 * @param item - YAML 中解析出的原始条目
 * @param index - 条目在数组中的索引
 * @param filePath - 配置文件路径
 * @returns 校验后的 ProviderItemConfig
 * @throws {ConfigError} 当必填字段缺失或类型非法时抛出
 */
function validateProviderItem(
  item: unknown,
  index: number,
  filePath: string,
): ProviderItemConfig {
  if (item === null || typeof item !== 'object') {
    throw new ConfigError(`providers[${index}] 应为对象`, filePath);
  }

  const record = item as Record<string, unknown>;
  const prefix = `providers[${index}]`;

  const name = record.name;
  const protocol = record.protocol;
  const model = record.model;
  const baseUrl = record.base_url;
  const apiKey = record.api_key;
  const thinking = record.thinking;

  if (typeof name !== 'string' || name.trim() === '') {
    throw new ConfigError(`${prefix} 缺少必填字段 name`, filePath);
  }
  if (typeof protocol !== 'string' || protocol.trim() === '') {
    throw new ConfigError(`${prefix} 缺少必填字段 protocol`, filePath);
  }
  if (typeof model !== 'string' || model.trim() === '') {
    throw new ConfigError(`${prefix} 缺少必填字段 model`, filePath);
  }
  if (typeof baseUrl !== 'string' || baseUrl.trim() === '') {
    throw new ConfigError(`${prefix} 缺少必填字段 base_url`, filePath);
  }
  if (typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new ConfigError(`${prefix} 缺少必填字段 api_key`, filePath);
  }

  if (protocol !== 'openai') {
    throw new ConfigError(`${prefix} 不支持的 protocol: ${protocol}`, filePath);
  }

  return {
    name: name.trim(),
    protocol,
    model: model.trim(),
    baseUrl: baseUrl.trim(),
    apiKey: apiKey.trim(),
    thinking: thinking === true,
  };
}

/**
 * 从配置对象中解析 providers 数组
 * @param record - 顶层配置对象
 * @param filePath - 配置文件路径
 * @returns Provider 条目列表，若未声明则返回 undefined
 * @throws {ConfigError} 当 providers 字段类型非法或为空时抛出
 */
function parseProviders(
  record: Record<string, unknown>,
  filePath: string,
): ProviderItemConfig[] | undefined {
  const providers = record.providers;

  if (providers === undefined) {
    return undefined;
  }

  if (!Array.isArray(providers)) {
    throw new ConfigError('providers 应为数组', filePath);
  }

  if (providers.length === 0) {
    throw new ConfigError('providers 数组不能为空', filePath);
  }

  return providers.map((item, index) => validateProviderItem(item, index, filePath));
}

/**
 * 从配置对象中解析第 1 章遗留的单 Provider 字段
 * @param record - 顶层配置对象
 * @param filePath - 配置文件路径
 * @returns 单个 Provider 条目，若字段不完整则返回 undefined
 * @throws {ConfigError} 当 protocol 不合法时抛出
 */
function parseLegacyProvider(
  record: Record<string, unknown>,
  filePath: string,
): ProviderItemConfig | undefined {
  const protocol = record.protocol;
  const model = record.model;
  const baseUrl = record.base_url;
  const apiKey = record.api_key;
  const thinking = record.thinking;

  if (
    typeof protocol !== 'string' || protocol.trim() === ''
    || typeof model !== 'string' || model.trim() === ''
    || typeof baseUrl !== 'string' || baseUrl.trim() === ''
    || typeof apiKey !== 'string' || apiKey.trim() === ''
  ) {
    return undefined;
  }

  if (protocol !== 'openai') {
    throw new ConfigError(`不支持的 protocol: ${protocol}`, filePath);
  }

  return {
    name: 'default',
    protocol,
    model: model.trim(),
    baseUrl: baseUrl.trim(),
    apiKey: apiKey.trim(),
    thinking: thinking === true,
  };
}

/**
 * 从 YAML 文件加载并校验配置
 * @param filePath - YAML 配置文件路径
 * @returns 校验后的 AppConfig 对象
 * @throws {ConfigError} 当文件不存在、解析失败或字段缺失时抛出
 */
export function loadConfig(filePath: string): AppConfig {
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
  const providers = parseProviders(record, filePath);

  if (providers !== undefined) {
    return { providers };
  }

  const legacyProvider = parseLegacyProvider(record, filePath);
  if (legacyProvider !== undefined) {
    return { providers: [legacyProvider] };
  }

  throw new ConfigError('缺少 Provider 配置（请配置 providers 数组或顶层字段）', filePath);
}
