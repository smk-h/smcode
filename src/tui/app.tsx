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

import React, { useCallback, useRef, useState } from 'react';
import { Box, ScrollBox, Text, useApp, useInput } from '@smai-kit/smink';

import { ConversationSession } from '../conversation/session.js';
import type { ChatStreamChunk, Provider, TokenUsage } from '../provider/types.js';

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

/**
 * TUI 主应用
 * @param props - 组件属性
 * @returns React 元素
 */
export function App({ provider }: AppProps): React.JSX.Element {
  const { exit } = useApp();
  const sessionRef = useRef(new ConversationSession());

  const [messages, setMessages] = useState(() => sessionRef.current.getMessages());
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

      const session = sessionRef.current;
      session.addUserMessage(trimmed);
      const assistantId = session.startAssistantResponse();

      setMessages(session.getMessages());
      setInput('');
      setLoading(true);

      try {
        const stream = provider.stream(
          { messages: session.getMessagesForModel() },
        );

        for await (const chunk of stream) {
          handleStreamChunk(session, assistantId, chunk);
          setMessages(session.getMessages());

          if (chunk.type === 'usage' && chunk.usage) {
            const usage = chunk.usage;
            setTokenUsage((previous) => ({
              promptTokens: previous.promptTokens + usage.promptTokens,
              completionTokens: previous.completionTokens + usage.completionTokens,
              totalTokens: previous.totalTokens + usage.totalTokens,
            }));
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        session.appendToAssistant(assistantId, {
          type: 'content',
          delta: `请求失败: ${message}`,
        });
        setMessages(session.getMessages());
      } finally {
        session.finalizeAssistant(assistantId);
        setMessages(session.getMessages());
        setLoading(false);
      }
    },
    [provider, loading],
  );

  /**
   * 将流块应用到会话中的助手消息
   * @param session - 当前会话
   * @param assistantId - 助手消息索引
   * @param chunk - Provider 返回的流块
   */
  function handleStreamChunk(
    session: ConversationSession,
    assistantId: number,
    chunk: ChatStreamChunk,
  ): void {
    if (chunk.type === 'usage') {
      return;
    }
    session.appendToAssistant(assistantId, chunk);
  }

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
          {messages.length === 0 ? (
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
              {messages.map((msg, index) => (
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
