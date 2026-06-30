# 我的初步想法

这一步的目标是支持多个provider切换。当启动时，发现yaml中有多个provider的时候，要显示一个选择切换的页面，待用户选择后才能进入对话界面。

技术要求:
(1)支持多个provider,使用如下格式：
```
providers:
  - name: openai-compat
    protocol: openai-compat
    base_url: https://api.deepseek.com
    api_key: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    model: deepseek-v4-flash
    thinking: true
  - name: ollama-compat
    protocol: openai-compat
    base_url: https://ollama.com/v1
    model: minimax-m3:cloud
    api_key: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    thinking: true
```

