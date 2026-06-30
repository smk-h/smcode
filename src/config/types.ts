/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : config/types.ts
 * Author     : sumu
 * Date       : 2026/06/30
 * Version    : 0.0.0
 * Description: 配置模块类型定义，支持多 Provider 与旧格式兼容
 * ======================================================
 */

/** 一个具体可用的 Provider 条目 */
export interface ProviderItemConfig {
  /** Provider 显示名称，用于选择界面 */
  name: string;
  /** 后端协议标识 */
  protocol: 'openai';
  /** 模型名称 */
  model: string;
  /** API 基础地址 */
  baseUrl: string;
  /** API 认证密钥 */
  apiKey: string;
  /** 是否展示/请求思考过程 */
  thinking: boolean;
}

/** YAML 配置在内存中的表示，兼容新旧两种格式 */
export interface AppConfig {
  /** 新版多 Provider 列表 */
  providers?: ProviderItemConfig[];

  // 以下为第 1 章遗留字段，用于向后兼容
  /** 后端协议 */
  protocol?: 'openai';
  /** 模型名称 */
  model?: string;
  /** API 基础地址 */
  baseUrl?: string;
  /** API 认证密钥 */
  apiKey?: string;
  /** 是否展示/请求思考过程 */
  thinking?: boolean;
}

/** Provider 解析器输出，描述当前应直接启动还是进入选择界面 */
export interface ProviderSelectionResult {
  /** 可直接使用的单一 Provider，当 items 长度为 1 时存在 */
  selected?: ProviderItemConfig;
  /** 需要展示的 Provider 列表 */
  items: ProviderItemConfig[];
  /** 是否需要渲染选择界面 */
  needsSelection: boolean;
}

/**
 * Provider 配置类型别名
 * @deprecated 请使用 ProviderItemConfig
 */
export type ProviderConfig = ProviderItemConfig;
