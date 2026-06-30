/**
 * https://opencode.ai/docs/zh-cn/zen/
 * https://opencode.ai/docs/zh-cn/go/
 * 
 * curl https://opencode.ai/zen/v1/chat/completions \
 *   -H "Authorization: Bearer $OPENCODE_API_KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "model": "deepseek-v4-flash-free",
 *     "messages": [{
 *       "role": "user",
 *       "content": "Why is the sky blue?"
 *     }],
 *     "stream": false
 *   }'
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const OPENCODE_BASE_API_URL = 'https://opencode.ai/zen/v1';
const OPENCODE_MODEL_ID = 'deepseek-v4-flash-free';
// const OPENCODE_BASE_API_URL = 'https://opencode.ai/zen/go/v1';
// const OPENCODE_MODEL_ID = 'deepseek-v4-flash';

const response = await fetch(`${OPENCODE_BASE_API_URL}/chat/completions`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.OPENCODE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: OPENCODE_MODEL_ID,
    messages: [
      {
        role: 'user',
        content: '介绍一下赛里木湖?',
      },
    ],
    stream: false,
  }),
});

const data = await response.json();
console.log(JSON.stringify(data, null, 2));
