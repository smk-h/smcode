/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : tui/app.tsx
 * Author     : sumu
 * Date       : 2026/07/01
 * Version    : 0.0.0
 * Description: smink TUI 主应用组件（Claude Code 风格）
 * ======================================================
 */

import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Box, ScrollBox, TerminalSizeContext, Text, useApp, useInput } from '@smai-kit/smink';

import type {
  ChatMessage,
  ChatStreamChunk,
  Provider,
  TokenUsage,
} from '../provider/types.js';
import type { ConversationMessage } from '../conversation/types.js';

import { AssistantMessage } from './components/AssistantMessage.js';
import { InputBar } from './components/InputBar.js';
import { StatusIndicator, type ThinkingStatus } from './components/StatusIndicator.js';
import { UserMessage } from './components/UserMessage.js';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import { theme } from './theme.js';

import {
  SPINNER_VERBS,
  TURN_COMPLETION_VERBS,
} from './constants/spinner.js';

/** App 组件属性 */
export interface AppProps {
  /** 对话 Provider 实例 */
  provider: Provider;
  /** 当前模型名称 */
  modelName: string;
  /** 当前 Provider 名称 */
  providerName: string;
  /** 应用版本号（运行时从 package.json 读取） */
  version: string;
}

/** 思考显示时长常量（research.md §5） */
const THINKING_MIN_DISPLAY_MS = 2000;

/** 默认系统提示 */
const DEFAULT_SYSTEM_PROMPT = 'You are a helpful coding assistant.';

/** 应用版本（package.json 的 version，import 时由打包注入） */
const APP_VERSION = '0.0.0';

const INITIAL_TOKEN_USAGE: TokenUsage = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
};

/**
 * 从动词池随机选取一个
 * @returns 进行式动词
 */
function sampleVerb(): string {
  const verbs = SPINNER_VERBS;
  return verbs[Math.floor(Math.random() * verbs.length)] ?? 'Thinking';
}

/**
 * 从完成式动词池随机选取一个
 * @returns 完成式动词
 */
function sampleCompletionVerb(): string {
  const verbs = TURN_COMPLETION_VERBS;
  return verbs[Math.floor(Math.random() * verbs.length)] ?? 'Worked';
}

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
export function App({
  provider,
  modelName,
  providerName,
  version,
}: AppProps): React.JSX.Element {
  const { exit } = useApp();
  const terminalSize = useContext(TerminalSizeContext);
  const columns = terminalSize.columns;

  const [messages, setMessages] = useState<ConversationMessage[]>([
    { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenUsage, setTokenUsage] = useState(INITIAL_TOKEN_USAGE);

  // 思考展开状态：键为助手消息在 visibleMessages 中的索引
  const [thinkingExpanded, setThinkingExpanded] = useState<Record<number, boolean>>({});

  // 处理中状态相关（轮次级低频状态）
  const [statusVerb, setStatusVerb] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [thinkingStatus, setThinkingStatus] = useState<ThinkingStatus>(null);
  const [completionText, setCompletionText] = useState<string | undefined>(undefined);

  // 流式信号：每收到 content chunk 置为 true，驱动 StatusIndicator 复位卡顿
  const [streamingSignal, setStreamingSignal] = useState(false);

  // 计时器引用
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 思考开始时间与阶段记录
  const thinkingStartRef = useRef<number>(0);
  const turnStartRef = useRef<number>(0);

  /**
   * 清理计时器
   */
  const clearTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * 切换最近一条助手消息的思考展开状态
   */
  const toggleLastThinking = useCallback((): void => {
    const visible = messages.filter((message) => message.role !== 'system');
    // 找到最后一条带思考内容的助手消息
    let lastAssistantVisibleIndex = -1;
    for (let i = visible.length - 1; i >= 0; i--) {
      if (visible[i].role === 'assistant' && visible[i].thinking) {
        lastAssistantVisibleIndex = i;
        break;
      }
    }
    if (lastAssistantVisibleIndex === -1) {
      return;
    }
    const targetIndex = lastAssistantVisibleIndex;
    setThinkingExpanded((prev) => ({
      ...prev,
      [targetIndex]: !prev[targetIndex],
    }));
  }, [messages]);

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

      // 重置轮次状态
      setStatusVerb(sampleVerb());
      setElapsedSeconds(0);
      setThinkingStatus(null);
      setCompletionText(undefined);
      setStreamingSignal(false);
      turnStartRef.current = Date.now();

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

      // 启动每秒计时器
      clearTimer();
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - turnStartRef.current) / 1000));
      }, 1000);

      let sawThinking = false;
      // 本地标记当前是否仍处于 thinking 阶段（避免闭包内读到过期的 state）
      let currentlyThinking = false;

      try {
        const stream = provider.stream({
          messages: toModelMessages(currentMessages),
        });

        for await (const chunk of stream) {
          // 思考状态机：进入/离开 thinking（research.md §5）
          if (chunk.type === 'thinking' && chunk.delta) {
            if (!sawThinking) {
              sawThinking = true;
              thinkingStartRef.current = Date.now();
              setThinkingStatus('thinking');
              currentlyThinking = true;
            }
            setStreamingSignal(true);
          }
          if (chunk.type === 'content' && chunk.delta) {
            // 离开思考：若曾思考，计算时长，至少显示 2 秒
            if (currentlyThinking) {
              currentlyThinking = false;
              const duration = Date.now() - thinkingStartRef.current;
              const minDuration = Math.max(duration, THINKING_MIN_DISPLAY_MS);
              setThinkingStatus(minDuration);
            }
            setStreamingSignal(true);
          }

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
        clearTimer();
        // 切换为完成式（如 Brewed for 7s）
        const totalSeconds = Math.max(
          1,
          Math.floor((Date.now() - turnStartRef.current) / 1000),
        );
        setCompletionText(`${sampleCompletionVerb()} for ${totalSeconds}s`);
        setThinkingStatus(null);

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
    [provider, loading, messages, clearTimer],
  );

  useInput((inputKey, key) => {
    if (key.ctrl && inputKey === 'c') {
      exit();
      return;
    }

    // ctrl+o：切换最近一条助手消息的思考展开状态
    if (key.ctrl && inputKey === 'o') {
      toggleLastThinking();
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

  // 退出时清理计时器
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const visibleMessages = messages.filter((message) => message.role !== 'system');
  const cwd = process.cwd();
  const resolvedVersion = version || APP_VERSION;

  return (
    <Box flexDirection="column" height="100%" padding={1}>
      {/* 顶部常驻欢迎主卡（无边框外层，圆角边框在 WelcomeScreen 内部） */}
      <WelcomeScreen
        version={resolvedVersion}
        modelName={modelName}
        providerName={providerName}
        cwd={cwd}
      />

      {/* 消息区：无外层边框，避免与欢迎页双重边框 */}
      <Box flexDirection="column" flexGrow={1} marginTop={1}>
        <ScrollBox stickyScroll>
          {visibleMessages.length === 0 ? (
            <Box padding={2} justifyContent="center" alignItems="center">
              <Text color={theme.dim} italic>
                输入消息开始对话...
              </Text>
            </Box>
          ) : (
            <Box flexDirection="column">
              {visibleMessages.map((msg, index) => {
                if (msg.role === 'user') {
                  return <UserMessage key={index} content={msg.content} />;
                }
                // 助手消息：仅最后一条（流式/最近完成）附带 completionText
                const isLastAssistant =
                  index === visibleMessages.length - 1 ||
                  (msg.role === 'assistant' &&
                    visibleMessages
                      .slice(index + 1)
                      .every((m) => m.role !== 'assistant'));
                return (
                  <AssistantMessage
                    key={index}
                    content={msg.content}
                    thinking={msg.thinking}
                    expanded={thinkingExpanded[index] ?? false}
                    onToggleThinking={toggleLastThinking}
                    streaming={msg.streaming}
                    completionText={
                      !msg.streaming && isLastAssistant && completionText
                        ? completionText
                        : undefined
                    }
                  />
                );
              })}

              {/* 处理中动态提示行（加载时显示） */}
              {loading && (
                <StatusIndicator
                  verb={statusVerb}
                  elapsedSeconds={elapsedSeconds}
                  tokenCount={tokenUsage.totalTokens}
                  thinkingStatus={thinkingStatus}
                  isStreaming={streamingSignal}
                  columns={columns}
                  elapsedMs={Date.now() - turnStartRef.current}
                />
              )}
            </Box>
          )}
        </ScrollBox>
      </Box>

      {/* 底部输入框 */}
      <InputBar
        value={input}
        disabled={loading}
        shortcutHint={loading ? 'esc to interrupt' : '? for shortcuts'}
      />
    </Box>
  );
}
