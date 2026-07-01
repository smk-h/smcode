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

import { render } from '@smai-kit/smink';

import { loadConfig } from './config/loader.js';
import { resolveProviderSelection } from './config/resolver.js';
import type { ProviderItemConfig } from './config/types.js';
import { createProvider } from './provider/factory.js';
import { ProviderSelector } from './tui/components/ProviderSelector.js';
import { App } from './tui/app.js';

/** 默认配置文件路径 */
const DEFAULT_CONFIG_PATH = '.smcode/config.yaml';

/** 应用版本号（来自 package.json，构建时由打包注入；运行时回退读取文件） */
const APP_VERSION = '0.0.0';

/**
 * 解析命令行参数，提取配置文件路径
 * @param args - 命令行参数数组（已剔除 node 与脚本路径）
 * @returns 配置文件路径
 */
function parseConfigPath(args: readonly string[]): string {
  const index = args.indexOf('--config');
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return DEFAULT_CONFIG_PATH;
}

/**
 * 让用户从多个 Provider 中选择一个
 *
 * 渲染 ProviderSelector 界面，等待用户确认或取消。
 *
 * @param providers - 可供选择的 Provider 列表
 * @returns 用户选中的 Provider 配置
 */
async function selectProvider(
  providers: readonly ProviderItemConfig[],
): Promise<ProviderItemConfig> {
  return new Promise<ProviderItemConfig>((resolve, reject) => {
    render(
      <ProviderSelector
        providers={providers}
        onSelect={(provider) => resolve(provider)}
        onCancel={() => reject(new Error('用户取消选择'))}
      />,
    )
      .then((instance) => instance.waitUntilExit())
      .catch(reject);
  });
}

/**
 * 命令行入口：解析参数、加载配置、选择 Provider 并启动 TUI
 * @param args - 命令行参数数组（已剔除 node 与脚本路径）
 * @returns 进程退出码，0 表示成功
 */
export async function main(
  args: readonly string[] = process.argv.slice(2),
): Promise<number> {
  const configPath = parseConfigPath(args);

  try {
    const config = loadConfig(configPath);
    const selection = resolveProviderSelection(config);

    const activeProvider = selection.needsSelection
      ? await selectProvider(selection.items)
      : selection.selected!;

    const provider = createProvider(activeProvider);
    const instance = await render(
      <App
        provider={provider}
        modelName={activeProvider.model}
        providerName={activeProvider.name}
        version={APP_VERSION}
      />,
    );
    await instance.waitUntilExit();
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // 配置加载、Provider 选择或创建失败时，以文本形式输出错误并退出
    console.error(`启动失败: ${message}`);
    return 1;
  }
}
