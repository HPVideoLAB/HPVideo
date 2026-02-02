# SSE Testing Guide

## 方法 1: Postman 测试 SSE

### 步骤 1: 创建任务

**请求配置：**
```
Method: POST
URL: http://localhost:3008/nest/large-language-model
```

**Headers:**
```
Content-Type: application/json
x-wallet-address: test-wallet-address
```

**Body (raw JSON):**
```json
{
  "model": "commercial-pipeline",
  "prompt": "测试视频生成",
  "image": "https://degptwav.oss-cn-hongkong.aliyuncs.com/uploads/2026/02/02/test.jpg",
  "voice_id": "fresh_youth",
  "duration": 5,
  "enableSmartEnhance": true,
  "enableUpscale": "720p",
  "txHash": "0xtest123456789"
}
```

**响应示例：**
```json
{
  "requestId": "abc123def456",
  "status": "processing",
  "message": "Task created successfully"
}
```

**复制 `requestId` 用于下一步！**

---

### 步骤 2: 测试 SSE 流

**请求配置：**
```
Method: GET
URL: http://localhost:3008/nest/large-language-model/{requestId}/stream
```

**重要设置：**
1. 点击右上角的 **Settings** (齿轮图标)
2. 找到 **Request timeout** 设置
3. 设置为 **0** (无限等待) 或者 **300000** (5分钟)
4. 关闭 **Automatically follow redirects**

**发送请求后：**
- Postman 会显示 "Waiting for response..."
- 在 **Response** 区域，选择 **Body** 标签
- 你会看到实时的 SSE 事件流

**SSE 响应示例：**
```
event: connected
data: {"requestId":"abc123","status":"processing"}

event: status
data: {"status":"processing","stage":"upscaling","message":"Video generation completed, starting upscaling","requestId":"abc123"}

event: completed
data: {"status":"completed","outputUrl":"https://example.com/video.mp4","requestId":"abc123","message":"Video generation completed successfully"}
```

---

## 方法 2: 使用 curl (推荐)

### 创建任务
```bash
curl -X POST http://localhost:3008/nest/large-language-model \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: test-wallet" \
  -d '{
    "model": "commercial-pipeline",
    "prompt": "测试视频",
    "image": "https://example.com/test.jpg",
    "voice_id": "fresh_youth",
    "duration": 5,
    "enableSmartEnhance": true,
    "enableUpscale": "720p",
    "txHash": "0xtest123"
  }'
```

### 测试 SSE 流
```bash
# 替换 YOUR_REQUEST_ID 为实际的 requestId
curl -N http://localhost:3008/nest/large-language-model/YOUR_REQUEST_ID/stream
```

**参数说明：**
- `-N` 或 `--no-buffer`: 禁用缓冲，实时显示输出

**输出示例：**
```
event: connected
data: {"requestId":"abc123","status":"processing"}

event: status
data: {"status":"processing","stage":"upscaling"}

event: completed
data: {"status":"completed","outputUrl":"https://..."}
```

---

## 方法 3: 使用浏览器 DevTools

### 步骤 1: 创建 HTML 测试页面

创建文件 `test-sse.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>SSE Test</title>
  <style>
    body { font-family: Arial; padding: 20px; }
    .log { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px; }
    .success { background: #d4edda; }
    .error { background: #f8d7da; }
    input, button { padding: 8px; margin: 5px; }
  </style>
</head>
<body>
  <h1>SSE Test Tool</h1>

  <div>
    <h3>1. Create Task</h3>
    <button onclick="createTask()">Create Test Task</button>
    <div id="createResult"></div>
  </div>

  <div>
    <h3>2. Connect to SSE Stream</h3>
    <input type="text" id="requestId" placeholder="Enter requestId" style="width: 300px;">
    <button onclick="connectSSE()">Connect</button>
    <button onclick="disconnect()">Disconnect</button>
  </div>

  <div>
    <h3>Events Log:</h3>
    <div id="log"></div>
  </div>

  <script>
    let eventSource = null;

    function log(message, type = 'log') {
      const logDiv = document.getElementById('log');
      const entry = document.createElement('div');
      entry.className = `log ${type}`;
      entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      logDiv.insertBefore(entry, logDiv.firstChild);
    }

    async function createTask() {
      try {
        const response = await fetch('http://localhost:3008/nest/large-language-model', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': 'test-wallet'
          },
          body: JSON.stringify({
            model: 'commercial-pipeline',
            prompt: '测试视频生成',
            image: 'https://example.com/test.jpg',
            voice_id: 'fresh_youth',
            duration: 5,
            enableSmartEnhance: true,
            enableUpscale: '720p',
            txHash: '0x' + Math.random().toString(36).substring(2, 15)
          })
        });

        const result = await response.json();
        document.getElementById('createResult').innerHTML =
          `<div class="log success">Task created! RequestId: ${result.requestId}</div>`;
        document.getElementById('requestId').value = result.requestId;
        log(`Task created: ${result.requestId}`, 'success');
      } catch (error) {
        log(`Error creating task: ${error.message}`, 'error');
      }
    }

    function connectSSE() {
      const requestId = document.getElementById('requestId').value;
      if (!requestId) {
        alert('Please enter a requestId');
        return;
      }

      disconnect(); // Close existing connection

      log(`Connecting to SSE stream for: ${requestId}`);

      eventSource = new EventSource(
        `http://localhost:3008/nest/large-language-model/${requestId}/stream`
      );

      eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        log(`✅ CONNECTED: ${JSON.stringify(data)}`, 'success');
      });

      eventSource.addEventListener('status', (event) => {
        const data = JSON.parse(event.data);
        log(`📊 STATUS: ${JSON.stringify(data)}`);
      });

      eventSource.addEventListener('completed', (event) => {
        const data = JSON.parse(event.data);
        log(`🎉 COMPLETED: ${JSON.stringify(data)}`, 'success');
        disconnect();
      });

      eventSource.addEventListener('error', (event) => {
        const data = JSON.parse(event.data);
        log(`❌ ERROR: ${JSON.stringify(data)}`, 'error');
        disconnect();
      });

      eventSource.onerror = (err) => {
        log(`❌ Connection error`, 'error');
        disconnect();
      };
    }

    function disconnect() {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
        log('Disconnected');
      }
    }
  </script>
</body>
</html>
```

### 步骤 2: 打开测试页面

1. 保存上面的 HTML 文件
2. 用浏览器打开 `test-sse.html`
3. 点击 "Create Test Task" 创建任务
4. 自动填充 requestId 后，点击 "Connect" 连接 SSE
5. 在 Events Log 中查看实时事件

### 步骤 3: 查看 Network 面板

1. 打开浏览器 DevTools (F12)
2. 切换到 **Network** 标签
3. 筛选 **EventStream** 类型
4. 点击 SSE 连接
5. 查看 **EventStream** 标签，可以看到实时事件

---

## 方法 4: 使用 Node.js 测试脚本 (最推荐)

### 安装依赖
```bash
npm install eventsource node-fetch
```

### 运行测试脚本
```bash
# 测试现有任务
node test-sse.js YOUR_REQUEST_ID

# 创建新任务并测试
node test-sse.js --create
```

**输出示例：**
```
Creating test task...
Task created: { requestId: 'abc123', status: 'processing' }

Connecting to SSE stream for requestId: abc123
URL: http://localhost:3008/nest/large-language-model/abc123/stream

Listening for events... (Press Ctrl+C to exit)

✅ [CONNECTED] { requestId: 'abc123', status: 'processing' }
📊 [STATUS UPDATE] { status: 'processing', stage: 'upscaling', message: '...' }
🎉 [COMPLETED] { status: 'completed', outputUrl: 'https://...' }

Task completed successfully!
```

---

## 方法 5: 使用 Postman Collection

### 导入 Postman Collection

创建文件 `SSE-Test.postman_collection.json`:

```json
{
  "info": {
    "name": "SSE Video Generation Test",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Create Task",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "x-wallet-address",
            "value": "test-wallet-address"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"model\": \"commercial-pipeline\",\n  \"prompt\": \"测试视频生成\",\n  \"image\": \"https://example.com/test.jpg\",\n  \"voice_id\": \"fresh_youth\",\n  \"duration\": 5,\n  \"enableSmartEnhance\": true,\n  \"enableUpscale\": \"720p\",\n  \"txHash\": \"0xtest123456789\"\n}"
        },
        "url": {
          "raw": "http://localhost:3008/nest/large-language-model",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3008",
          "path": ["nest", "large-language-model"]
        }
      }
    },
    {
      "name": "2. SSE Stream",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "http://localhost:3008/nest/large-language-model/{{requestId}}/stream",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3008",
          "path": ["nest", "large-language-model", "{{requestId}}", "stream"]
        }
      }
    },
    {
      "name": "3. Get Task Status (Polling - Old Way)",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "http://localhost:3008/nest/large-language-model/{{requestId}}",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3008",
          "path": ["nest", "large-language-model", "{{requestId}}"]
        }
      }
    }
  ]
}
```

### 使用步骤：
1. 在 Postman 中点击 **Import**
2. 选择上面的 JSON 文件
3. 运行 "1. Create Task"
4. 复制响应中的 `requestId`
5. 在 Postman 中设置变量：`requestId` = 你复制的值
6. 运行 "2. SSE Stream"

---

## 常见问题

### Q1: Postman 显示 "Could not get response"
**原因：** 请求超时
**解决：**
1. Settings → Request timeout → 设置为 0 或更大的值
2. 或者使用 curl/浏览器测试

### Q2: SSE 连接立即关闭
**原因：** 任务已经完成或不存在
**解决：**
1. 检查 requestId 是否正确
2. 创建新任务测试

### Q3: 看不到实时更新
**原因：** Postman 可能缓冲了输出
**解决：** 使用 curl 或浏览器测试

### Q4: CORS 错误
**原因：** 跨域请求被阻止
**解决：**
1. 确保后端 CORS 已启用
2. 或者使用 Postman/curl (不受 CORS 限制)

---

## 推荐测试顺序

1. **首选：** 使用 `node test-sse.js --create` (最简单)
2. **次选：** 使用浏览器 HTML 测试页面 (可视化)
3. **备选：** 使用 curl (命令行)
4. **最后：** 使用 Postman (体验不佳)

---

## 验证 SSE 是否工作

### 成功的标志：
- ✅ 连接建立后收到 `connected` 事件
- ✅ 任务进行中收到 `status` 事件
- ✅ 任务完成后收到 `completed` 事件
- ✅ 连接自动关闭

### 失败的标志：
- ❌ 连接立即断开
- ❌ 收到 `error` 事件
- ❌ 超时无响应

---

## 性能对比测试

### 测试轮询方式（旧）：
```bash
# 每2秒请求一次，观察网络流量
while true; do
  curl http://localhost:3008/nest/large-language-model/YOUR_ID
  sleep 2
done
```

### 测试 SSE 方式（新）：
```bash
# 单个长连接，观察网络流量
curl -N http://localhost:3008/nest/large-language-model/YOUR_ID/stream
```

**对比结果：**
- 轮询：每2秒一个完整的 HTTP 请求/响应
- SSE：一个长连接，只在状态变化时传输数据
