import OpenAI from "openai";

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

// for backward compatibility, you can still use `https://api.deepseek.com/v1` as `baseURL`.
const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: `${process.env.DEEPSEEK_API_KEY}`
});

async function main() {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "你好!" }
    ],
    model: "deepseek-v4-flash",
    thinking: {
      type: "disabled"
    }
  });

  console.log(JSON.stringify(completion, null, 2));
  console.log("--- content ---");
  console.log(completion.choices[0].message.content);
}

main();
