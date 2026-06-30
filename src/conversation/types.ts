/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : conversation/types.ts
 * Author     : sumu
 * Date       : 2026/06/30
 * Version    : 0.0.0
 * Description: 会话模块类型定义
 * ======================================================
 */

/** TUI 内部维护的展示级消息 */
export interface ConversationMessage {
  /** 消息角色 */
  role: 'user' | 'assistant' | 'system';
  /** 消息文本内容 */
  content: string;
  /** 思考过程内容 */
  thinking?: string;
  /** 是否仍在流式接收中 */
  streaming?: boolean;
}
