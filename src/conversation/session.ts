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
    this._messages.push({
      role: 'user',
      content,
    });
  }

  /**
   * 创建一条空的助手消息并开始流式接收
   * @returns 助手消息在会话中的索引 ID，用于后续追加内容
   */
  public startAssistantResponse(): number {
    this._messages.push({
      role: 'assistant',
      content: '',
      thinking: '',
      streaming: true,
    });
    return this._messages.length - 1;
  }

  /**
   * 向指定助手消息追加流式块
   * @param id - 助手消息索引 ID
   * @param chunk - Provider 返回的流块
   */
  public appendToAssistant(id: number, chunk: ChatStreamChunk): void {
    const message = this._messages[id];
    if (message?.role !== 'assistant') {
      return;
    }

    if (chunk.type === 'content' && chunk.delta) {
      message.content += chunk.delta;
    } else if (chunk.type === 'thinking' && chunk.delta) {
      message.thinking = (message.thinking ?? '') + chunk.delta;
    }
  }

  /**
   * 结束指定助手消息的流式接收
   * @param id - 助手消息索引 ID
   */
  public finalizeAssistant(id: number): void {
    const message = this._messages[id];
    if (message?.role === 'assistant') {
      message.streaming = false;
    }
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
