/**
 * DeepSeek 工具调用示例（思考模式 + 多工具 + 多轮对话）
 * 
 * 演示如何使用 function calling 结合 thinking 模式：
 * 1. 定义多个工具（get_date, get_weather）
 * 2. 启用 thinking 模式，打印模型的推理过程 (reasoning_content)
 * 3. 支持模型连续调用多个工具（sub_turn 循环）
 * 4. 演示多轮用户提问共享对话历史
 * 
 * 重要提示：
 * - 在思考模式下，进行了工具调用的轮次必须完整回传 reasoning_content 给 API
 * - 若未正确回传 reasoning_content，API 会返回 400 报错
 * - 因此 messages.push(message) 必须保留完整的 message 对象，不能过滤字段
 * 
 * 运行方式：
 *   node scripts/deepseek/21_thinking_toolcall.mjs
 * 
 * 环境变量：
 *   需要在 scripts/.env 中配置 DEEPSEEK_API_KEY
 */

// ==================== 依赖导入 ====================

// OpenAI SDK，用于调用兼容 OpenAI 格式的 API（DeepSeek 使用相同格式）
import OpenAI from "openai";

// dotenv 用于加载 .env 文件中的环境变量
import dotenv from 'dotenv';

// Node.js 内置模块，用于获取当前文件路径和目录
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ==================== 环境变量配置 ====================

// 获取当前文件所在的目录路径（ESM 模式下没有 __dirname，需要手动获取）
const __dirname = dirname(fileURLToPath(import.meta.url));

// 从上级目录（scripts/）加载 .env 文件，读取 DEEPSEEK_API_KEY 等环境变量
dotenv.config({ path: join(__dirname, '..', '.env') });

// ==================== API 客户端初始化 ====================

// 创建 OpenAI 客户端实例，配置 DeepSeek 的 API 地址和密钥
const client = new OpenAI({
  baseURL: 'https://api.deepseek.com',  // DeepSeek API 基础地址
  apiKey: `${process.env.DEEPSEEK_API_KEY}`  // 从环境变量读取 API 密钥
});

// ==================== 工具定义 ====================

/**
 * 定义工具列表（Function Calling Schema）
 * 
 * 每个工具包含：
 * - type: 固定为 "function"
 * - function.name: 工具名称，模型会根据此名称调用
 * - function.description: 工具描述，帮助模型理解何时使用此工具
 * - function.parameters: JSON Schema 格式的参数定义
 * 
 * 本示例定义了两个工具：
 * 1. get_date: 获取当前日期（无参数）
 * 2. get_weather: 获取指定城市和日期的天气（需要 location 和 date 参数）
 */
const tools = [
  {
    type: "function",
    function: {
      name: "get_date",
      description: "Get the current date",
      parameters: { 
        type: "object", 
        properties: {}  // 无参数
      },
    }
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get weather of a location, the user should supply the location and date.",
      parameters: {
        type: "object",
        properties: {
          location: { 
            type: "string", 
            description: "The city name"  // 城市名称
          },
          date: { 
            type: "string", 
            description: "The date in format YYYY-mm-dd"  // 日期格式
          },
        },
        required: ["location", "date"]  // 两个参数都是必需的
      },
    }
  },
];

// ==================== 工具实现（模拟） ====================

/**
 * 模拟获取当前日期
 * 
 * @returns {string} 当前日期，格式为 YYYY-MM-DD
 * @example "2026-06-13"
 */
function getDateMock() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');  // 月份从 0 开始，需要 +1
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 模拟获取天气（区分今天和明天）
 * 
 * 根据传入的日期参数，返回不同的模拟天气数据：
 * - 今天：晴天，10~18°C
 * - 明天：多云，7~13°C
 * - 其他日期：未知
 * 
 * @param {string} location - 城市名称，如 "Hangzhou"
 * @param {string} date - 日期，格式为 YYYY-MM-DD
 * @returns {string} 格式化的天气信息
 * @example "Hangzhou 明天：多云 7~13°C"
 */
function getWeatherMock(location, date) {
  // 计算今天的日期字符串
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  // 计算明天的日期字符串
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  
  // 根据日期返回不同的天气信息
  if (date === todayStr) {
    return `${location} 今天：晴 10~18°C`;
  } else if (date === tomorrowStr) {
    return `${location} 明天：多云 7~13°C`;
  } else {
    return `${location} ${date}：未知`;
  }
}

/**
 * 工具调用映射表
 * 
 * 将工具名称映射到对应的实现函数
 * 当模型返回 tool_calls 时，通过此表查找并执行对应的函数
 * 
 * @type {Object.<string, Function>}
 */
const TOOL_CALL_MAP = {
  "get_date": getDateMock,
  "get_weather": getWeatherMock
};

// ==================== API 调用函数 ====================

/**
 * 发送消息到 DeepSeek API（启用思考模式）
 * 
 * 配置说明：
 * - model: 使用 deepseek-v4-flash 模型
 * - messages: 对话历史消息数组
 * - tools: 可用工具列表
 * - reasoning_effort: 推理努力程度，"high" 表示更深入的思考
 * - extra_body.thinking: 启用思考模式，模型会返回 reasoning_content 字段
 * 
 * @param {Array} messages - 对话历史消息数组
 * @returns {Promise<Object>} API 响应对象，包含 choices、usage 等字段
 */
function sendMessages(messages) {
  return client.chat.completions.create({
    model: "deepseek-v4-flash",
    messages,
    tools,
    reasoning_effort: "high",
    extra_body: { thinking: { type: "enabled" } }
  });
}

// ==================== 对话轮次处理 ====================

/**
 * 执行一轮对话（支持模型连续调用工具）
 * 
 * 流程说明：
 * 1. 发送当前消息历史到 API
 * 2. 解析响应，打印 reasoning_content（思考过程）、content（文本回复）、tool_calls（工具调用）
 * 3. 将模型回复完整加入消息历史（必须包含 reasoning_content，否则后续请求会 400 报错）
 * 4. 如果有工具调用：
 *    - 遍历所有 tool_calls
 *    - 解析参数，调用对应的工具函数
 *    - 将工具结果以 role: "tool" 加入消息历史
 *    - 继续循环（sub_turn++），让模型基于工具结果继续推理
 * 5. 如果没有工具调用，说明模型已给出最终答案，退出循环
 * 
 * @param {number} turn - 轮次编号，用于日志显示（如 1、2）
 * @param {Array} messages - 对话历史消息数组（会被修改）
 */
async function runTurn(turn, messages) {
  let subTurn = 1;  // 子轮次计数器，一轮对话中可能有多次 API 调用
  
  while (true) {
    // 打印分隔符和当前调用信息
    console.log("\n" + "=".repeat(60));
    console.log(`>>> Turn ${turn}.${subTurn} API 调用`);
    console.log("=".repeat(60));
    
    // 调用 API
    const response = await sendMessages(messages);
    const choice = response.choices[0];
    const message = choice.message;
    
    // 打印完整响应 JSON（用于调试）
    console.log(JSON.stringify(response, null, 2));
    console.log("--- content ---");
    
    // 提取关键信息
    const reasoningContent = message.reasoning_content || "";  // 思考过程（可能为空）
    const content = message.content || "";                      // 文本回复（有 tool_calls 时通常为空）
    const toolCalls = message.tool_calls;                       // 工具调用列表（可能为 null）
    
    // 打印解析后的内容
    console.log(`\n[Reasoning]\n${reasoningContent}`);
    console.log(`\n[Content]\n${content}`);
    console.log(`\n[Tool Calls]\n${JSON.stringify(toolCalls, null, 2)}`);
    
    // 【关键】将模型回复完整加入历史
    // 必须保留 reasoning_content 字段，否则后续请求会返回 400 错误
    messages.push(message);
    
    // 检查是否有工具调用
    // 如果没有工具调用，说明模型已给出最终答案，退出循环
    if (!toolCalls || toolCalls.length === 0) {
      break;
    }
    
    // 处理所有工具调用
    for (const tool of toolCalls) {
      // 从映射表中获取对应的工具函数
      const toolFunction = TOOL_CALL_MAP[tool.function.name];
      
      // 解析工具参数（JSON 字符串转对象）
      const args = JSON.parse(tool.function.arguments);
      
      // 调用工具函数，使用展开运算符传递参数
      const toolResult = toolFunction(...Object.values(args));
      
      // 打印工具调用结果
      console.log(`\n[Tool Result] ${tool.function.name}(${JSON.stringify(args)}) => ${toolResult}`);
      
      // 将工具结果加入消息历史
      messages.push({
        role: "tool",                    // 固定为 "tool"
        tool_call_id: tool.id,           // 关联到对应的 tool_call
        content: String(toolResult),     // 工具返回结果（必须是字符串）
      });
    }
    
    // 子轮次 +1，继续循环让模型基于工具结果继续推理
    subTurn++;
  }
  
  // 打印轮次结束信息
  console.log("\n" + "=".repeat(60));
  console.log(`>>> Turn ${turn} 结束`);
  console.log("=".repeat(60));
}

// ==================== 主函数 ====================

/**
 * 主函数：演示多轮对话流程
 * 
 * 流程：
 * 1. 初始化空的消息历史
 * 2. 第一轮：询问杭州明天的天气
 *    - 模型会先调用 get_date 获取今天日期，计算明天日期
 *    - 然后调用 get_weather 获取天气
 *    - 最后给出最终回答
 * 3. 第二轮：询问广州明天的天气（共享第一轮的历史）
 *    - 模型已经知道今天日期，可能直接调用 get_weather
 *    - 给出最终回答
 */
async function main() {
  // 初始化空的消息历史数组
  const messages = [];
  
  // ========== 第一轮提问 ==========
  messages.push({
    role: "user",
    content: "How's the weather in Hangzhou Tomorrow"
  });
  await runTurn(1, messages);
  
  // ========== 第二轮提问（共享历史） ==========
  // 在第一轮的基础上追加新的用户消息
  messages.push({
    role: "user",
    content: "How's the weather in Guangzhou Tomorrow"
  });
  await runTurn(2, messages);
}

// 启动主函数
main();
