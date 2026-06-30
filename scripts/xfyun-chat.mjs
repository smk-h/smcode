import OpenAI from 'openai';

// 必填：从服务管控页面获取对应服务的APIKey和API Base
const apiKey = process.env.XF_Qwen3D5_35B_A3B || '<YOUR_API_KEY>';
const apiBase = 'https://maas-api.cn-huabei-1.xf-yun.com/v2';

const client = new OpenAI({ apiKey, baseURL: apiBase });

/**
 * 统一的调用函数，支持多种场景
 *
 * @param {string} modelId - 要调用的模型ID
 * @param {Array} messages - 对话消息列表
 * @param {boolean} useStream - 是否使用流式输出
 * @param {object} extraBody - 额外请求参数，如 response_format
 */
async function unifiedChatTest(modelId, messages, useStream = false, extraBody = {}) {
  try {
    const response = await client.chat.completions.create(
      {
        model: modelId,
        messages,
        stream: useStream,
        temperature: 0.7,
        max_tokens: 4096,
        stream_options: { include_usage: true },
        ...extraBody,
      },
      {
        headers: { lora_id: '0' }, // 调用微调大模型时，对应替换为模型服务卡片上的resourceId
      }
    );

    if (useStream) {
      // 处理流式响应
      let fullResponse = '';
      console.log('--- 流式输出 ---');
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          process.stdout.write(content);
          fullResponse += content;
        }
      }
      console.log('\n\n--- 完整响应 ---');
      console.log(fullResponse);
    } else {
      // 处理非流式响应
      console.log('--- 非流式输出 ---');
      const message = response.choices[0].message;
      console.log(message.content);
    }
  } catch (e) {
    console.error(`请求出错: ${e.message || e}`);
  }
}

async function main() {
  const modelId = process.env.XF_MODEL_ID || 'xopqwen35v35b'; // 必填：模型卡片上对应的modelId

  // 1. 普通非流式调用
  console.log('********* 1. 普通通非流式调用 *********');
  const plainMessages = [{ role: 'user', content: '你好，请介绍一下自己。' }];
  await unifiedChatTest(modelId, plainMessages, false);

  // 2. 普通流式调用
  console.log('\n********* 2. 普通流式调用 *********');
  const streamMessages = [{ role: 'user', content: '写一首关于夏天的诗。' }];
  await unifiedChatTest(modelId, streamMessages, true);

  // 3. JSON Mode 调用
  console.log('\n********* 3. JSON Mode 调用 *********');
  const jsonMessages = [
    {
      role: 'user',
      content: '请给我一个关于上海的JSON对象，包含城市名称(city)和人口数量(population)。',
    },
  ];
  const jsonExtraBody = {
    response_format: { type: 'json_object' },
    search_disable: true, // JSON Mode下建议关闭搜索
  };
  await unifiedChatTest(modelId, jsonMessages, false, jsonExtraBody);

  // 4. 测试stop和前缀续写功能
  console.log('\n********* 4. 测试stop和前缀续写功能 *********');
  console.log("设置stop词: ['。', '！'] - 模型遇到句号或感叹号时会停止生成");
  const stopMessages = [{ role: 'user', content: '给我解释下1加1等于多少。' }];
  await unifiedChatTest(modelId, stopMessages, true, {
    stop: ['。', '！'],
    continue_final_message: true,
  });

  // 5. Tools/Function Calling 调用示例
  console.log('\n********* 5. Tools/Function Calling 调用示例 *********');
  const tools = [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: '获取指定城市的天气信息',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string', description: '城市名称，例如：北京、上海' },
            unit: { type: 'string', enum: ['celsius', 'fahrenheit'], description: '温度单位' },
          },
          required: ['location'],
        },
      },
    },
  ];
  const toolMessages = [{ role: 'user', content: '北京今天天气怎么样？' }];
  try {
    const toolResponse = await client.chat.completions.create({
      model: modelId,
      messages: toolMessages,
      tools,
      tool_choice: 'auto',
    });
    const toolMessage = toolResponse.choices[0].message;
    if (toolMessage.tool_calls?.length) {
      console.log(`模型请求调用工具: ${toolMessage.tool_calls[0].function.name}`);
      console.log(`参数: ${toolMessage.tool_calls[0].function.arguments}`);
    } else {
      console.log(toolMessage.content);
    }
  } catch (e) {
    console.error(`请求出错: ${e.message || e}`);
  }
}

main();
