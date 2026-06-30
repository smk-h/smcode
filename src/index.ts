/**
 * =====================================================
 * Copyright © sumu. 2026-present. Tech. Co., Ltd. All rights reserved.
 * File name  : index.ts
 * Author     : sumu
 * Date       : 2026/06/30
 * Version    : 0.0.0
 * Description: smcode 命令行工具核心逻辑，提供 run 入口供 bin 脚本调用
 * ======================================================
 */

/** 应用默认问候目标名称 */
const DEFAULT_NAME: string = 'world';

/**
 * 打印一行问候语
 * @param name - 问候目标名称，未提供时使用默认值
 * @returns 拼接后的问候字符串
 */
export function sayHello(name: string = DEFAULT_NAME): string {
  const message: string = `hello ${name}!`;
  // 输出到标准输出，便于后续管道与重定向
  console.log(message);

  return message;
}

/**
 * 命令行入口：解析参数并执行对应逻辑
 * @param args - 命令行参数数组（已剔除 node 与脚本路径）
 * @returns 进程退出码，0 表示成功
 */
export function main(args: readonly string[] = process.argv.slice(2)): number {
  // 当前仅打印问候语；后续可在此扩展参数解析与子命令分发
  void args;
  sayHello();

  return 0;
}
