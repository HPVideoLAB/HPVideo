import { Injectable, Logger } from '@nestjs/common';

// 导出返回结果接口
export interface OptimizedResult {
  videoPrompt: string;
  imageEditPrompt: string;
}

@Injectable()
export class SmartEnhancerService {
  private readonly logger = new Logger(SmartEnhancerService.name);

  // ==========================================
  // 配置区域
  // ==========================================

  // 1. LLM 配置 (走本地 Python 后端代理 -> Qwen)
  // 确保你的 Python 后端已启动且端口为 8080
  private readonly DEGPT_URL =
    'http://127.0.0.1:8080/api/v1/chat/completion/proxy';

  // 你的鉴权 Token
  private readonly DEGPT_TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjB4ZGU4Nzg0MDExZTFDODY0RTM3Njk3ZmFFMjhhNkUxOWFlNEU2REQ5ZCIsImV4cCI6MTc2OTY3ODk0Mn0.yFJYgjMRU5V0t7pZeV4GM6PLZfHMcpv3if1d-k1bdEc';

  // 🔥 切换回 Qwen 模型
  private readonly LLM_MODEL = 'qwen3-235b-a22b';

  // 2. Wavespeed 配置 (图片生成)
  private readonly WAVESPEED_URL = 'https://api.wavespeed.ai/api/v3';
  private readonly WAVESPEED_KEY =
    process.env.WAVESPEED_KEY || 'YOUR_WAVESPEED_KEY';

  /**
   * 主入口
   */
  async runTest(originalPrompt: string, imageUrl?: string) {
    this.logger.log(
      `>>> 启动顶级摄影师流程 (Qwen Brain) Input: "${originalPrompt}"`,
    );

    // Step 1: 摄影师(Qwen) 思考画面布局，输出英文描述
    const prompts = await this.optimizePrompts(originalPrompt);

    // Step 2: 修图师(Nano Banana) 执行画面，生成 4K 图
    let optimizedImageUrl = imageUrl;
    if (imageUrl) {
      optimizedImageUrl = await this.optimizeImage(
        imageUrl,
        prompts.imageEditPrompt,
      );
    }

    this.logger.log('<<< 流程结束');

    return {
      originalInput: { prompt: originalPrompt, image: imageUrl },
      aiAnalysis: prompts,
      finalOutput: {
        videoPrompt: prompts.videoPrompt,
        startFrame: optimizedImageUrl, // 返回最终的 4K 美图
      },
    };
  }

  // ==========================================
  // 🔥 核心 A: 顶级摄影师指令 (Qwen 版本)
  // ==========================================
  async optimizePrompts(originalPrompt: string): Promise<OptimizedResult> {
    this.logger.log(`[1/2] Qwen 正在构思构图与人物...`);

    // 🔥 "固定提示词"逻辑：强制 AI 扮演摄影师进行推理
    const template = `
    Role: You are the world's TOP Commercial Photographer and Art Director.
    Task: Based on the user's input image description, create the visual instructions for an AI Image Editor (Google Nano Banana) and a Video Generator.

    User Input: "${originalPrompt}"

    ---
    
    ### 1. RULES FOR "imageEditPrompt" (The Perfect Shot):
    * **Rule #1 (Fidelity)**: START with "Keep the [product] design, logo, and shape 100% UNCHANGED."
    * **Rule #2 (Auto-Inference Human)**: ANALYZE the product type. 
        * IF it is a **Cup/Drink/Food**: YOU MUST add a "Beautiful woman/model holding it" or "Enjoying it in a cozy setting".
        * IF it is **Fashion/Wearable**: YOU MUST add a "Model wearing it".
        * IF it is **Tech/Gadget**: Add "Human hands interacting with it".
        * *Do not ask. Just do it.*
    * **Rule #3 (Lighting & Vibe)**: Use professional terms: "Rembrandt Lighting", "Cinematic Depth of Field", "Golden Hour", "High-end Studio".
    * **Rule #4 (Realism)**: NO abstract art. REAL LIFE textures (skin, wood, glass). 

    ### 2. RULES FOR "videoPrompt" (The 20s Commercial):
    * Create a 20-second visual flow.
    * [0-5s]: Macro texture shot.
    * [5-15s]: **Interaction**. (e.g., "The beauty lifts the cup to her lips", "Steam rising", "Slow motion smile").
    * [15-20s]: Wide reveal of the luxury environment.
    * Keywords: "Dolly Zoom", "Slow Motion 60fps", "8k", "Photorealistic".

    ---
    **CRITICAL**: Output MUST be in **ENGLISH**.
    **Output strict JSON only:**
    {
      "imageEditPrompt": "...",
      "videoPrompt": "..."
    }
    `;

    try {
      // 使用 fetch 调用你的 Python 后端
      const response = await fetch(this.DEGPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.DEGPT_TOKEN}`,
        },
        body: JSON.stringify({
          model: this.LLM_MODEL,
          messages: [{ role: 'user', content: template }],
          stream: false, // 必须是 false 才能拿到完整 JSON
          project: 'DecentralGPT',
          max_tokens: 2000,
          enable_thinking: true, // Qwen 支持 thinking，开着也没事
        }),
      });

      const textResponse = await response.text();

      let jsonStr = '';
      try {
        const data = JSON.parse(textResponse);
        // 兼容 Python 后端返回的结构
        const content = data?.choices?.[0]?.message?.content || '';
        // 正则提取 JSON，防止 Qwen 啰嗦
        const match = content.match(/\{[\s\S]*\}/);
        if (match) jsonStr = match[0];
      } catch (e) {}

      if (!jsonStr) throw new Error('Valid JSON not found in Qwen response');
      return JSON.parse(jsonStr);
    } catch (e) {
      this.logger.error('提示词生成失败', e);
      // 降级策略
      return {
        imageEditPrompt: `Keep the product unchanged. A model's hand holding the product, cinematic lighting, photorealistic 4k. ${originalPrompt}`,
        videoPrompt: `Cinematic commercial. Macro shot of texture, slow motion interaction, dynamic lighting, 8k. ${originalPrompt}`,
      };
    }
  }

  // ==========================================
  // 核心 B: 图片优化 (Nano Banana Pro)
  // ==========================================
  async optimizeImage(imageUrl: string, prompt: string): Promise<string> {
    this.logger.log(`[Image] 提交给 Nano Banana Pro (4K)...`);
    // return prompt;
    try {
      const payload = {
        prompt: prompt, // Qwen 生成的英文提示词
        images: [imageUrl], // 原图
        resolution: '4k', // 强制 4K
        output_format: 'png',
        enable_sync_mode: false,
        num_outputs: 1,
        number_of_images: 1,
      };

      const submitRes = await fetch(
        `${this.WAVESPEED_URL}/google/nano-banana-pro/edit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.WAVESPEED_KEY}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const submitData = await submitRes.json();
      const requestId = submitData?.data?.id;

      if (!submitRes.ok || !requestId) {
        this.logger.error('Nano Banana 提交失败', submitData);
        return imageUrl;
      }

      this.logger.log(`任务 ID: ${requestId}，开始等待出图...`);
      return await this.pollImageResult(requestId, imageUrl);
    } catch (e) {
      this.logger.error('图片优化异常', e);
      return imageUrl;
    }
  }

  // ==========================================
  // 轮询器
  // ==========================================
  private async pollImageResult(
    requestId: string,
    originalUrl: string,
  ): Promise<string> {
    const maxRetries = 120;
    const interval = 2000;

    for (let i = 0; i < maxRetries; i++) {
      await new Promise((r) => setTimeout(r, interval));

      try {
        const res = await fetch(
          `${this.WAVESPEED_URL}/predictions/${requestId}/result`,
          { headers: { Authorization: `Bearer ${this.WAVESPEED_KEY}` } },
        );

        if (!res.ok) continue;

        const json = await res.json();
        const status = json?.data?.status;

        if (status === 'completed') {
          const outputs = json.data.outputs;
          if (outputs && outputs.length > 0) {
            const finalUrl = outputs[0];
            this.logger.log(`✅ 惊艳图片生成成功: ${finalUrl}`);
            return finalUrl;
          }
          return originalUrl;
        }

        if (status === 'failed') {
          this.logger.warn(`❌ 任务失败: ${json.data.error}`);
          return originalUrl;
        }
      } catch (e) {}
    }

    this.logger.warn('❌ 图片优化超时');
    return originalUrl;
  }
}
