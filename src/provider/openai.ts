/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : provider/openai.ts
 * Author     : sumu
 * Date       : 2026/06/30
 * Version    : 0.0.0
 * Description: OpenAI 兼容协议 Provider 实现
 * ======================================================
 */

import OpenAI from 'openai';

import type { ProviderItemConfig } from '../config/types.js';
import type { ChatMessage, ChatStreamChunk, Provider } from './types.js';

/** OpenAI 兼容协议 Provider */
export class OpenAIProvider implements Provider {
  /** 协议标识 */
  public readonly protocol = 'openai';

  private readonly _client: OpenAI;
  private readonly _config: ProviderItemConfig;

  /**
   * @param config - Provider 配置
   */
  constructor(config: ProviderItemConfig) {
    this._config = config;
    this._client = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
    });
  }

  /**
   * 发起流式对话请求
   * @param request - 包含聊天消息列表的请求对象
   * @param signal - 用于取消请求的 AbortSignal
   * @returns 异步可迭代器，逐块产出 content / thinking / usage
   */
  public async *stream(
    request: { messages: ChatMessage[] },
    signal?: AbortSignal,
  ): AsyncIterable<ChatStreamChunk> {
    const stream = await this._client.chat.completions.create(
      {
        model: this._config.model,
        messages: request.messages as OpenAI.ChatCompletionMessageParam[],
        stream: true,
        stream_options: {
          include_usage: true,
        },
      },
      { signal },
    );

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      const reasoningContent = (delta as { reasoning_content?: string } | undefined)
        ?.reasoning_content;

      if (reasoningContent) {
        yield {
          type: 'thinking',
          delta: reasoningContent,
        };
      }

      if (delta?.content) {
        yield {
          type: 'content',
          delta: delta.content,
        };
      }

      if (chunk.usage) {
        yield {
          type: 'usage',
          usage: {
            promptTokens: chunk.usage.prompt_tokens ?? 0,
            completionTokens: chunk.usage.completion_tokens ?? 0,
            totalTokens: chunk.usage.total_tokens ?? 0,
          },
        };
      }
    }
  }
}
