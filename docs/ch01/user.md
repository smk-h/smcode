# 我的初步想法

我要从零开始做一个命令行AI助手(Coding Agent)，叫smcode，类似ClaudeCode。用typescript开发。
 
这一步的目标是：用户在终端启动smcode后，进入一个交互式对话界面（TUI），可以输入问题，smcode调用大模型API，把回复流式地逐字打印出来。支持多轮对话，AI能记住之前说过的话。如果模型返回思考过程（reasoning/thinking），TUI 也要把思考过程展示出来。同时，TUI 底部状态栏要展示当前对话的 token 消耗。

技术要求：

支持OpenAI格式的API后端，流式用SSE，不是等全部生成完再返回
Provider层要抽象成统一接口，以后方便加新的后端
TUI渲染使用[@smai-kit/smink](https://cnb.cool/smk.h/smink/-/blob/main/README.md)

配置格式：用 YAML 配置文件管理 LLM 供应商信息，四个核心字段：
protocol 决定走哪家协议（当前仅支持 openai）
model 指定模型
base_url指定请求的地址
api_key 做认证。
