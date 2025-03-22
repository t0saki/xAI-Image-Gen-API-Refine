# xAI API Proxy

这个 Cloudflare Worker 作为 xAI API 的代理，特别处理图像生成请求，仅保留文档中支持的参数。

## 功能

- 代理所有 xAI API 端点请求
- 特别过滤图像生成请求参数，只保留支持的参数：
  - `model` (例如 "grok-2-image")
  - `prompt` (必需)
  - `n` (生成图像数量，1-10，默认为1)
  - `response_format` ("url" 或 "b64_json")
- 处理 CORS 以支持跨域请求

**注意：** 根据 xAI 官方文档，`quality`、`size` 和 `style` 参数目前不受支持，这些参数会被过滤掉。

## 部署说明

### 前提条件

- 安装 [Node.js](https://nodejs.org/) (建议 14.x 或更高版本)
- 安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### 安装

1. 克隆此仓库
2. 安装依赖：

```bash
npm install
```

### 开发

本地开发：

```bash
npm run dev
```

这将启动一个本地开发服务器，通常在 http://localhost:8787

### 配置

编辑 `wrangler.toml` 文件，更新路由和域名设置。

### 部署

部署到 Cloudflare Workers：

```bash
npm run deploy
```

## 使用方法

将你的 API 请求发送到 Worker URL 而不是直接发送到 xAI API。
Worker 会将请求转发到 xAI API，并对图像生成请求进行参数过滤。

### 例子

如果你的 Worker 部署在 `https://xai-proxy.your-domain.workers.dev`：

```javascript
fetch('https://xai-proxy.your-domain.workers.dev/v1/images/generations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-xai-api-key'
  },
  body: JSON.stringify({
    prompt: '一只小猫在玩毛线球',
    model: 'grok-2-image',
    n: 1,
    response_format: 'url',
    // 其他不支持的参数会被过滤掉，如 quality, size, style
  })
})
```

响应示例：

```json
{
  "data": [
    {
      "url": "https://...",
      "revised_prompt": "..."
    }
  ]
}
```

如果设置 `response_format` 为 `b64_json`，则响应中会包含 `b64_json` 而不是 `url`。 