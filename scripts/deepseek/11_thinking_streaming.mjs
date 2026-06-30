import OpenAI from "openai";

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: `${process.env.DEEPSEEK_API_KEY}`
});

async function main() {
  const stream = await openai.chat.completions.create({
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "你好!(回答不要超过5个字)" }
    ],
    model: "deepseek-v4-flash",
    thinking: {
      type: "enabled"
    },
    stream: true,
    stream_options: {
      include_usage: true
    }
  });

  let fullContent = "";
  let fullReasoning = "";
  let lastChunk = null;
  let chunkCount = 0;

  for await (const chunk of stream) {
    chunkCount++;
    const delta = chunk.choices[0]?.delta;
    if (delta) {
      if (delta.reasoning_content) {
        fullReasoning += delta.reasoning_content;
      }
      if (delta.content) {
        fullContent += delta.content;
      }
    }
    console.log(`--- chunk #${chunkCount} ---`);
    console.log(JSON.stringify(chunk, null, 2));
    lastChunk = chunk;
  }

  console.log(`\n总 chunk 数: ${chunkCount}`);

  console.log("\n=== 完整拼接结果 ===");
  console.log("reasoning_content:", fullReasoning);
  console.log("content:", fullContent);

  if (lastChunk?.usage) {
    console.log("usage:", JSON.stringify(lastChunk.usage, null, 2));
  }
}

main();
