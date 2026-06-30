/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : tui/app.tsx
 * Author     : sumu
 * Date       : 2026/06/30
 * Version    : 0.0.0
 * Description: smink TUI 主应用组件
 * ======================================================
 */

import React, { useCallback, useState } from 'react';
import { Box, ScrollBox, Text, useApp, useInput } from '@smai-kit/smink';

import type {
  ChatMessage,
  ChatStreamChunk,
  Provider,
  TokenUsage,
} from '../provider/types.js';
import type { ConversationMessage } from '../conversation/types.js';

import { InputBar } from './components/InputBar.js';
import { MessageBubble } from './components/MessageBubble.js';
import { theme } from './theme.js';

/** App 组件属性 */
export interface AppProps {
  /** 对话 Provider 实例 */
  provider: Provider;
}

const INITIAL_TOKEN_USAGE: TokenUsage = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
};

/** 默认系统提示 */
const DEFAULT_SYSTEM_PROMPT = 'You are a helpful coding assistant.';

/**
 * 将展示级消息转换为模型可用的聊天消息
 * @param messages - 展示级消息列表
 * @returns 模型消息列表
 */
function toModelMessages(messages: readonly ConversationMessage[]): ChatMessage[] {
  return messages
    .filter((message) => message.role !== 'system')
    .filter((message) => message.role !== 'assistant' || message.content.trim() !== '')
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

/**
 * 向指定助手消息追加流块
 * @param messages - 消息列表
 * @param assistantId - 助手消息索引
 * @param chunk - Provider 返回的流块
 * @returns 更新后的消息列表
 */
function appendToAssistant(
  messages: readonly ConversationMessage[],
  assistantId: number,
  chunk: ChatStreamChunk,
): ConversationMessage[] {
  if (chunk.type === 'usage') {
    return [...messages];
  }

  return messages.map((message, index) => {
    if (index !== assistantId || message.role !== 'assistant') {
      return message;
    }

    if (chunk.type === 'content' && chunk.delta) {
      return { ...message, content: message.content + chunk.delta };
    }

    if (chunk.type === 'thinking' && chunk.delta) {
      return { ...message, thinking: (message.thinking ?? '') + chunk.delta };
    }

    return message;
  });
}

/**
 * TUI 主应用
 * @param props - 组件属性
 * @returns React 元素
 */
export function App({ provider }: AppProps): React.JSX.Element {
  const { exit } = useApp();

  const [messages, setMessages] = useState<ConversationMessage[]>([
    { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenUsage, setTokenUsage] = useState(INITIAL_TOKEN_USAGE);

  /**
   * 发送用户消息并流式接收助手回复
   * @param text - 用户输入文本
   */
  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      const trimmed = text.trim();
      if (!trimmed || loading) {
        return;
      }

      let currentMessages: ConversationMessage[] = [
        ...messages,
        { role: 'user', content: trimmed },
      ];
      setMessages(currentMessages);
      setInput('');
      setLoading(true);

      const assistantId = currentMessages.length;
      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: '', thinking: '', streaming: true },
      ];
      setMessages(currentMessages);

      try {
        const stream = provider.stream({
          messages: toModelMessages(currentMessages),
        });

        for await (const chunk of stream) {
          currentMessages = appendToAssistant(currentMessages, assistantId, chunk);
          setMessages(currentMessages);

          if (chunk.type === 'usage' && chunk.usage) {
            const usage = chunk.usage;
            setTokenUsage((previous) => ({
              promptTokens: previous.promptTokens + usage.promptTokens,
              completionTokens: previous.completionTokens + usage.completionTokens,
              totalTokens: previous.totalTokens + usage.totalTokens,
            }));
          }

          // 让出事件循环，确保每个 chunk 都能被渲染到终端
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        currentMessages = appendToAssistant(currentMessages, assistantId, {
          type: 'content',
          delta: `请求失败: ${message}`,
        });
        setMessages(currentMessages);
      } finally {
        currentMessages = currentMessages.map((message, index) => {
          if (index !== assistantId || message.role !== 'assistant') {
            return message;
          }
          return { ...message, streaming: false };
        });
        setMessages(currentMessages);
        setLoading(false);
      }
    },
    [provider, loading, messages],
  );

  useInput((inputKey, key) => {
    if (key.ctrl && inputKey === 'c') {
      exit();
      return;
    }

    if (key.return) {
      if (input.trim() && !loading) {
        void sendMessage(input);
      }
      return;
    }

    if (key.backspace || key.delete) {
      setInput((previous) => previous.slice(0, -1));
      return;
    }

    if (inputKey && !key.ctrl && !key.meta && !key.return) {
      setInput((previous) => previous + inputKey);
    }
  });

  const visibleMessages = messages.filter((message) => message.role !== 'system');

  return (
    <Box flexDirection="column" height="100%" padding={1}>
      <Box
        borderStyle="bold"
        borderColor={theme.primary}
        paddingX={1}
        justifyContent="space-between"
      >
        <Text color={theme.primary} bold>
          smcode
        </Text>
        <Text color={theme.dim}>Ctrl+C 退出</Text>
      </Box>

      <Box
        flexDirection="column"
        flexGrow={1}
        borderStyle="single"
        borderColor={theme.border}
        marginTop={1}
      >
        <ScrollBox stickyScroll>
          {visibleMessages.length === 0 ? (
            <Box
              padding={2}
              justifyContent="center"
              alignItems="center"
            >
              <Text color={theme.dim} italic>
                输入消息开始对话...
              </Text>
            </Box>
          ) : (
            <Box flexDirection="column" padding={1}>
              {visibleMessages.map((msg, index) => (
                <MessageBubble key={index} msg={msg} />
              ))}
            </Box>
          )}
        </ScrollBox>
      </Box>

      <InputBar
        value={input}
        disabled={loading}
        tokenUsage={tokenUsage}
      />
    </Box>
  );
}
