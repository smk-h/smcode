/**
 * 使用 OpenAI SDK 调用 Ollama 云模型（OpenAI 兼容接口）。
 *
 * 文档：https://docs.ollama.com/api/openai-compatibility
 * 云模型：https://ollama.com/blog/cloud-models
 *
 * 可用云模型（model 参数）：
 *   - gpt-oss:120b-cloud
 *   - gpt-oss:20b-cloud
 *   - qwen3-coder:480b-cloud
 *   - deepseek-v3.1:671b-cloud
 *
 * 等价 curl：
 *   curl https://ollama.com/v1/chat/completions \
 *     -H "Authorization: Bearer $OLLAMA_API_KEY" \
 *     -H "Content-Type: application/json" \
 *     -d '{
 *       "model": "gpt-oss:120b-cloud",
 *       "messages": [{"role": "user", "content": "Why is the sky blue?"}]
 *     }'
 *
 * 运行：node scripts/ollama-openai.mjs
 */
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

// 通过 OpenAI 兼容接口访问 Ollama 云端
const client = new OpenAI({
  apiKey: process.env.OLLAMA_CLOUD_API_KEY,
  baseURL: 'https://ollama.com/v1',
});

const OLLAMA_MODEL_ID = 'gpt-oss:120b-cloud';

// 非流式调用
const response = await client.chat.completions.create({
  model: OLLAMA_MODEL_ID,
  messages: [
    {
      role: 'user',
      content: '天空为什么是蓝色的?',
    },
  ],
});

// 打印完整的 JSON 响应数据
console.log(JSON.stringify(response, null, 2));

// 也可以单独打印回复内容
console.log('\n回复内容：\n', response.choices[0].message.content);

/**
 * 流式调用示例（如需逐字输出，可改用以下写法）：
 *
 * const stream = await client.chat.completions.create({
 *   model: OLLAMA_MODEL_ID,
 *   messages: [{ role: 'user', content: '介绍一下赛里木湖?' }],
 *   stream: true,
 * });
 * for await (const chunk of stream) {
 *   process.stdout.write(chunk.choices[0]?.delta?.content ?? '');
 * }
 */
