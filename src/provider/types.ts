/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : provider/types.ts
 * Author     : sumu
 * Date       : 2026/06/30
 * Version    : 0.0.0
 * Description: Provider 层类型定义，包含消息、流块与统一 Provider 接口
 * ======================================================
 */

/** 可发送给模型的角色类型 */
export type ChatRole = 'system' | 'user' | 'assistant';

/** 发送给模型的一条聊天消息 */
export interface ChatMessage {
  /** 消息角色 */
  role: ChatRole;
  /** 消息文本内容 */
  content: string;
}

/** Token 用量统计 */
export interface TokenUsage {
  /** 提示 token 数量 */
  promptTokens: number;
  /** 生成 token 数量 */
  completionTokens: number;
  /** 总 token 数量 */
  totalTokens: number;
}

/** Provider 流式返回的最小单元 */
export interface ChatStreamChunk {
  /** 块类型：content 为最终答案文本，thinking 为思考过程，usage 为 token 用量 */
  type: 'content' | 'thinking' | 'usage';
  /** 文本增量，content 与 thinking 类型时使用 */
  delta?: string;
  /** token 用量，usage 类型时使用 */
  usage?: TokenUsage;
}

/** Provider 统一接口，屏蔽不同后端的协议差异 */
export interface Provider {
  /** 当前 Provider 对应的协议标识 */
  readonly protocol: string;

  /**
   * 发起流式对话请求
   * @param request - 包含聊天消息列表的请求对象
   * @param signal - 用于取消请求的 AbortSignal
   * @returns 异步可迭代器，逐块产出 ChatStreamChunk
   */
  stream(
    request: { messages: ChatMessage[] },
    signal?: AbortSignal,
  ): AsyncIterable<ChatStreamChunk>;
}
