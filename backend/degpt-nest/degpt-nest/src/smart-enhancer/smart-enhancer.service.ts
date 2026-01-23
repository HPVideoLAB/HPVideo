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

  // 1. LLM 配置
  private readonly DEGPT_URL = 'https://degpt.ai/api/v1/chat/completion/proxy';

  // 你的鉴权 Token
  private readonly DEGPT_TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjB4ZGU4Nzg0MDExZTFDODY0RTM3Njk3ZmFFMjhhNkUxOWFlNEU2REQ5ZCIsImV4cCI6MTc2OTY3ODk0Mn0.yFJYgjMRU5V0t7pZeV4GM6PLZfHMcpv3if1d-k1bdEc';

  // 模型
  private readonly LLM_MODEL = 'gpt-5.2';

  // 2. Wavespeed 配置
  private readonly WAVESPEED_URL = 'https://api.wavespeed.ai/api/v3';
  private readonly WAVESPEED_KEY =
    process.env.WAVESPEED_KEY || 'YOUR_WAVESPEED_KEY';

  /**
   * 主入口
   */
  async runTest(originalPrompt: string, imageUrl?: string) {
    this.logger.log(
      `>>> 启动顶级摄影师流程 (GPT-5.2 Brain) Input: "${originalPrompt}"`,
    );

    // Step 1: 摄影师 思考画面布局
    const prompts = await this.optimizePrompts(originalPrompt);

    // Step 2: 修图师 执行画面
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
        startFrame: optimizedImageUrl,
      },
    };
  }

  // ==========================================
  // 🔥 核心 A: 顶级摄影师指令
  // ==========================================
  async optimizePrompts(originalPrompt: string): Promise<OptimizedResult> {
    this.logger.log(`[1/2] GPT-5.2 正在构思构图与人物...`);

    const template = `
    Role: You are the world's TOP Commercial Photographer and Video Director.
    Task: Based on the user's input image description, create visual instructions for an AI Image Editor and a Video Generator.

    User Input: "${originalPrompt}"

    ---
    
    ### 1. RULES FOR "imageEditPrompt" (The Perfect Hero Shot):
    * **Rule #1 (Fidelity)**: START with "Keep the [product] design, logo, and shape 100% UNCHANGED."
    * **Rule #2 (Smart Model & Style Inference)**: 
        * **Demographics**: MUST use **"Stunning Asian/Korean model"** (K-pop star vibe, flawless skin).
        * **Gender Logic**:
            * IF product is masculine (e.g., Gaming, Men's Watch, Suit): Use "Handsome Asian Male Model".
            * IF product is feminine (e.g., Cosmetics, Jewelry): Use "Beautiful Asian Female Model".
            * IF neutral (e.g., Car, Coffee, Tech): Choose the most attractive option (e.g., Luxury Car -> Sexy/Elegant Female; Tech -> Cool Youth).
        * **Outfit & Vibe**:
            * Luxury Car/Nightlife -> **Sexy, High-fashion, Glamorous**.
            * Tea/Home/Cozy -> **Elegant, Soft-knits, Zen**.
            * Sports/Outdoors -> **Athletic, Energetic, Sweaty skin texture**.
    * **Rule #3 (Lighting & Vibe)**: Use professional terms: "Rembrandt Lighting", "Volumetric Fog", "Golden Hour", "Cyberpunk Neon" (if tech).
    * **Rule #4 (Realism)**: REAL LIFE textures. Pore-level skin detail, fabric stitching, material imperfections.

    ### 2. RULES FOR "videoPrompt" (The 20s Cinematic Ad):
    * Create a 20-second dynamic visual flow using **Advanced Camera Movements**.
    * **[0-5s] The Hook (Macro & Texture)**: 
        * Movement: **"Slow Macro Pan"** or **"Rack Focus"** (blur to sharp).
        * Focus on product texture, logo, or droplets.
    * **[5-15s] The Interaction (Emotion & Story)**: 
        * Movement: **"Orbit/Arc Shot"** (circling the subject) or **"Handheld Shake"** (for realism).
        * Action: The Asian model interacts with the product (sipping, driving, typing, applying). Capture micro-expressions (wink, slight smile, exhale).
    * **[15-20s] The Grand Reveal (Environment)**: 
        * Movement: **"Dolly Out"** (pull back fast) or **"Crane Shot"** (move up high).
        * Show the luxury context (Seoul skyline, high-end studio, nature).
    * **Keywords**: "8k", "Slow Motion 60fps", "Color Graded", "Unreal Engine 5 Render Style".

    ---
    **CRITICAL**: Output MUST be in **ENGLISH**.
    **Output strict JSON only:**
    {
      "imageEditPrompt": "...",
      "videoPrompt": "..."
    }
    `;

    try {
      const response = await fetch(this.DEGPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.DEGPT_TOKEN}`,
        },
        body: JSON.stringify({
          model: this.LLM_MODEL,
          messages: [{ role: 'user', content: template }],
          stream: false,
          project: 'DecentralGPT',
          max_tokens: 2000,
          enable_thinking: false,
        }),
      });

      const textResponse = await response.text();
      // this.logger.debug(`Raw LLM Response: ${textResponse}`);

      let jsonStr = '';
      try {
        const data = JSON.parse(textResponse);

        // 🔥 [核心修复点] 兼容多种返回格式
        let content = '';

        // 1. 尝试 OpenAI 标准格式 (choices[0].message.content)
        if (data?.choices?.[0]?.message?.content) {
          content = data.choices[0].message.content;
        }
        // 2. 尝试 DeGPT 新格式 (output[0].content[0].text)
        else if (data?.output?.[0]?.content?.[0]?.text) {
          content = data.output[0].content[0].text;
        }

        // 正则提取 JSON
        const match = content.match(/\{[\s\S]*\}/);
        if (match) jsonStr = match[0];
      } catch (e) {}

      if (!jsonStr) throw new Error('Valid JSON not found in LLM response');
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

    // 🔥 [修复点 2] 之前你这里直接 return 了，导致图片没有生成
    // return prompt;

    try {
      const payload = {
        prompt: prompt,
        images: [imageUrl],
        resolution: '4k',
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
