/**
 * curl https://ollama.com/api/chat \
 *   -H "Authorization: Bearer $OLLAMA_API_KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "model": "gpt-oss:120b",
 *     "messages": [{
 *       "role": "user",
 *       "content": "Why is the sky blue?"
 *     }],
 *     "stream": false
 *   }'
 */
const response = await fetch('https://ollama.com/api/chat', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-oss:120b',
    messages: [
      {
        role: 'user',
        content: '你好?',
      },
    ],
    stream: false,
  }),
});

const data = await response.json();
console.log(JSON.stringify(data, null, 2));
