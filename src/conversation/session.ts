/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : conversation/session.ts
 * Author     : sumu
 * Date       : 2026/06/30
 * Version    : 0.0.0
 * Description: 当前对话会话的历史管理
 * ======================================================
 */

import type { ChatMessage, ChatStreamChunk } from '../provider/types.js';
import type { ConversationMessage } from './types.js';

/** 当前对话会话，在内存中维护用户与助手的消息历史 */
export class ConversationSession {
  private _messages: ConversationMessage[] = [];

  /**
   * 追加一条用户消息
   * @param content - 用户输入内容
   */
  public addUserMessage(content: string): void {
    this._messages = [
      ...this._messages,
      { role: 'user', content },
    ];
  }

  /**
   * 创建一条空的助手消息并开始流式接收
   * @returns 助手消息在会话中的索引 ID，用于后续追加内容
   */
  public startAssistantResponse(): number {
    const id = this._messages.length;
    this._messages = [
      ...this._messages,
      {
        role: 'assistant',
        content: '',
        thinking: '',
        streaming: true,
      },
    ];
    return id;
  }

  /**
   * 向指定助手消息追加流式块
   * @param id - 助手消息索引 ID
   * @param chunk - Provider 返回的流块
   */
  public appendToAssistant(id: number, chunk: ChatStreamChunk): void {
    this._messages = this._messages.map((message, index) => {
      if (index !== id || message.role !== 'assistant') {
        return message;
      }

      if (chunk.type === 'content' && chunk.delta) {
        return {
          ...message,
          content: message.content + chunk.delta,
        };
      }

      if (chunk.type === 'thinking' && chunk.delta) {
        return {
          ...message,
          thinking: (message.thinking ?? '') + chunk.delta,
        };
      }

      return message;
    });
  }

  /**
   * 结束指定助手消息的流式接收
   * @param id - 助手消息索引 ID
   */
  public finalizeAssistant(id: number): void {
    this._messages = this._messages.map((message, index) => {
      if (index !== id || message.role !== 'assistant') {
        return message;
      }
      return { ...message, streaming: false };
    });
  }

  /**
   * 获取用于模型调用的消息历史（仅含 role 与 content）
   * @returns 聊天消息列表
   */
  public getMessagesForModel(): ChatMessage[] {
    return this._messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
  }

  /**
   * 获取当前会话所有展示级消息
   * @returns 展示级消息列表
   */
  public getMessages(): readonly ConversationMessage[] {
    return this._messages;
  }
}
