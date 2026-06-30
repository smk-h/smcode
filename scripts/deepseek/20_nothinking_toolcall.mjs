/**
 * DeepSeek 工具调用示例（无思考模式）
 * 
 * 演示如何使用 function calling 功能：
 * 1. 定义工具（tools）
 * 2. 发送用户消息，模型返回 tool_call
 * 3. 执行工具函数，获取结果
 * 4. 将工具结果传回模型，获取最终回答
 */

import OpenAI from "openai";

// 加载环境变量
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 获取当前文件所在目录
const __dirname = dirname(fileURLToPath(import.meta.url));
// 从上级目录的 .env 文件加载环境变量
dotenv.config({ path: join(__dirname, '..', '.env') });

// 初始化 OpenAI 客户端，使用 DeepSeek API
const client = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: `${process.env.DEEPSEEK_API_KEY}`
});

/**
 * 定义工具列表
 * 每个工具包含 type、function 名称、描述和参数定义
 */
const tools = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get weather of a location, the user should supply a location first.",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city and state, e.g. San Francisco, CA",
          }
        },
        required: ["location"]
      },
    }
  },
];

/**
 * 模拟天气查询函数
 * @param {string} location - 城市名称
 * @returns {string} 格式化的天气信息
 */
async function getWeather(location) {
  // 模拟天气数据
  const mockData = {
    "hangzhou": { temp: 24, condition: "晴", humidity: 65 },
    "shanghai": { temp: 26, condition: "多云", humidity: 70 },
    "beijing": { temp: 18, condition: "阴", humidity: 40 },
    "san francisco": { temp: 16, condition: "雾", humidity: 80 },
  };
  const key = location.toLowerCase();
  const data = mockData[key] || { temp: 22, condition: "未知", humidity: 50 };
  return `${location}: ${data.temp}℃, ${data.condition}, 湿度 ${data.humidity}%`;
}

/**
 * 发送消息到 DeepSeek API
 * @param {Array} messages - 消息数组
 * @returns {Promise} API 响应
 */
function sendMessages(messages) {
  return client.chat.completions.create({
    model: "deepseek-v4-flash",
    messages,
    thinking: { type: "disabled" },
    tools
  });
}

/**
 * 主函数：演示完整的工具调用流程
 */
async function main() {
  // 初始化对话消息
  const messages = [{ role: "user", content: "How's the weather in Hangzhou, Zhejiang?" }];
  
  // 第一次 API 调用：用户提问，模型返回 tool_call
  console.log("\n" + "=".repeat(60));
  console.log(">>> 第 1 次 API 调用 (用户提问，模型返回 tool_call)");
  console.log("=".repeat(60));
  const response = await sendMessages(messages);
  console.log(JSON.stringify(response, null, 2));
  console.log("--- content ---");
  const message = response.choices[0].message;

  console.log(`\nUser>\t ${messages[0].content}`);

  // 解析模型返回的 tool_call
  const tool = message.tool_calls[0]; // 这里会包含一个tool.id和tool.function（包括工具名称和要传入的参数）
  messages.push(message);

  // 执行工具函数
  const args = JSON.parse(tool.function.arguments);
  const result = await getWeather(args.location);
  console.log(`\nTool>\t getWeather("${args.location}") => ${result}`);

  // 将工具结果添加到消息列表
  messages.push({ role: "tool", tool_call_id: tool.id, content: result });

  // 第二次 API 调用：传入工具结果，模型返回最终回答
  console.log("\n" + "=".repeat(60));
  console.log(">>> 第 2 次 API 调用 (传入 tool 结果，模型返回最终回答)");
  console.log("=".repeat(60));
  const response2 = await sendMessages(messages);
  console.log(JSON.stringify(response2, null, 2));
  console.log("--- content ---");
  const message2 = response2.choices[0].message;

  console.log(`\nModel>\t ${message2.content}`);
  console.log("\n" + "=".repeat(60));
}

main();
