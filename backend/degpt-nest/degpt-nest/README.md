# Large Language Model 模块：单模型 + 组合式流水线（Pipeline）说明

本模块支持两类任务：

1. **单模型任务（Single Model）**
   - 例如：`pika` / `wan-2.1` / `sam3` / `ltx-2-19b` / `video-upscaler-pro` / `kling-video-to-audio`
2. **组合式任务（Commercial Pipeline）**
   - `commercial-pipeline`：从「产品图 + 简短提示词」生成「宣传视频」，并可选：
     - 智能优化提示词（Smart Enhance）
     - 配音（Kling Video-to-Audio）
     - 画质提升（Video Upscaler Pro）

---

## 1. txHash 幂等与“免费重试”机制

### 1.1 为什么要 txHash

- 用户支付后，偶尔第三方 API 会失败。
- 为了避免“失败后再次生成还要重复扣费”，引入 `txHash` 做幂等与重试依据。

### 1.2 规则

创建任务时会先查库：

- 若存在同一 `txHash` 的记录，且状态为：
  - `processing` 或 `completed`：**拦截**（防止重复提交/重放）
  - `failed`：**允许原地复活**（免费重试），更新同一条记录并重新提交任务
- 若不存在：创建新记录

> 前端策略：如果历史记录中看到某条任务 `failed` 且带 `txHash`，显示“免费重试”按钮（无需再次支付）。

---

## 2. 三个关键 Hook 的职责

### 2.1 `useModelDispatcher.ts` —— 单模型分发器（Single Model Router）

**作用**：根据 `dto.model` 将请求分发到对应的模型 Hook（submit），并统一返回：

- `requestId`：第三方任务 ID
- `thumbUrl`：用于前端列表/历史记录缩略图

**什么时候用它**

- 所有“单模型”创建任务都会走它

**新增单个模型时改哪里**

- ✅ 在 `useModelDispatcher.ts` 里新增一个 `case 'your-model': ...`
- ✅ 同时新增对应的模型 hook（`useYourModel.ts`）以及 DTO 校验文件

---

### 2.2 `useCommercialPipelineRunner.ts` —— 组合式流水线创建/复活器（Pipeline Creator/Reviver）

**作用**：专门处理 `model === 'commercial-pipeline'` 的 create 逻辑，包含：

1. 校验组合式输入（产品图、音效/背景音乐等）
2. 可选调用 `SmartEnhancerService.runTest()` 获取：
   - `videoPrompt`
   - `startFrame`（生成视频所需起始图片）
3. 提交流水线第一步（LTX），拿到 `ltxRequestId`
4. 组装 `pipelineState` 写入 MongoDB（`record.params.pipeline`）
5. 若已有 `txHash` 且记录为 `failed`，则“原地复活”更新旧记录（免费重试）

**它负责什么**

- ✅ 只负责 **create 阶段** 的流程与写库
- ✅ 确保 pipeline 初始化后可被轮询推进

**新增组合式 pipeline 时改哪里**

- ✅ 新建一个类似的 runner：`useXxxPipelineRunner.ts`
- ✅ 在 `LargeLanguageModelService.create()` 加 `if (model === 'xxx-pipeline') runner.run(...)`

---

### 2.3 `useCommercialPipeline.ts` —— 组合式流水线推进引擎（Pipeline State Machine）

**作用**：负责 pipeline 在轮询（`findOne`）时的“状态机推进”，核心方法是：

- `advanceOnce(state)`：推进一步并返回 `{ state, apiResult }`

状态推进逻辑（示例：commercial-pipeline）：

- `ltx_submitted` → 轮询 LTX 完成 → 提交 Kling → `kling_submitted`
- `kling_submitted` → 轮询 Kling 完成 → (可选) 提交 Upscale → `upscale_submitted` 或 `completed`
- `upscale_submitted` → 轮询 Upscale 完成 → `completed`
- 任一步失败 → `failed`

**它负责什么**

- ✅ 只负责“推进状态”，不写库
- ✅ 写库由 `LargeLanguageModelService.findOne()` 完成（把最新 state 写回 `record.params.pipeline`）

**新增组合式 pipeline 的推进规则时改哪里**

- ✅ 新建一个 pipeline 引擎：`useXxxPipeline.ts`（实现自己的 `advanceOnce`）
- ✅ 在 `findOne()` 增加对应的 modelName 分支调用它

---

## 3. Service 层职责划分（推荐约定）

### 3.1 `LargeLanguageModelService.create()`

- 统一处理 `txHash` 幂等与免费重试规则
- 若为 `commercial-pipeline`：
  - 调用 `useCommercialPipelineRunner.run()`（内部会提交 LTX 并写库）
- 若为单模型：
  - 调用 `useModelDispatcher.submit(dto)` 获取 `requestId/thumbUrl`
  - 写库（新建或 failed 复活）
  - 失败时抛 400，前端展示“免费重试”

### 3.2 `LargeLanguageModelService.findOne()`

- 若为 `commercial-pipeline`：
  - 从 `record.params.pipeline` 取 state
  - 调用 `useCommercialPipeline.advanceOnce(state)` 推进一步
  - 将新 state 写回 DB，并根据 stage 更新：
    - `record.status`
    - `record.outputUrl`
- 若为单模型：
  - 统一走 `predictions/{id}/result` 轮询（当前用 `usePika().getResult()` 作为通用轮询器）

---

## 4. 未来扩展指南

### 4.1 新增单模型（Single Model）

1. 新建 `src/hook/useYourModel.ts`（submit/getResult）
2. 新建 DTO 文件（`dto/modules/your-model.ts`）
3. 在 `CreateLargeLanguageModelDto` 合并 DTO
4. 在 `useModelDispatcher.ts` 增加 `case 'your-model'`

### 4.2 新增组合式流水线（Pipeline）

1. 新建 `src/hook/useXxxPipelineRunner.ts`（create 阶段：校验/可选智能优化/提交第一步/写库）
2. 新建 `src/hook/useXxxPipeline.ts`（轮询推进：实现 advanceOnce 状态机）
3. Service：
   - `create()` 加分支调用 runner
   - `findOne()` 加分支调用 pipeline 引擎推进并写库

---

## 5. 注意事项（强烈建议）

- 如果希望“组合式流程任一步出现异常都能落库为 failed 供免费重试”，需要：
  - `useCommercialPipelineRunner.run()` 内部对 submit/智能优化异常做 catch 并写 `failed` 记录
  - `findOne()` pipeline 分支对 `advanceOnce` 抛出的异常做 catch 并写 `failed` 状态
