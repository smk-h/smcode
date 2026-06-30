#!/usr/bin/env node
/**
 * smcode 命令行工具入口（薄壳）
 * 仅负责转发调用编译产物 out/index.js 中的 main 函数，
 * 实际逻辑集中在 src/index.ts，便于后续扩展与单元测试。
 */

import { main } from '../out/index.js';

// 转发命令行参数给核心逻辑；后续可在此接入参数解析器（如 commander/yargs）
const code = main(process.argv.slice(2));

// 以 run 返回的退出码结束进程，便于 shell 脚本捕获执行结果
process.exit(code);
