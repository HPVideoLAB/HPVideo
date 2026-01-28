import { Injectable, Logger } from '@nestjs/common';
// ✅ 引入刚刚更新的音色库
import {
  ASIAN_MARKET_VOICES,
  VOICE_MENU_PROMPT,
} from '@/constants/voice-presets';

export interface OptimizedResult {
  videoVisualPrompt: string; // 画面 (包含 @音色 台词指令)
  videoAudioPrompt: string; // 声音 (主要是 BGM/SFX)
  imageEditPrompt: string; // 修图
}

@Injectable()
export class SmartEnhancerService {
  private readonly logger = new Logger(SmartEnhancerService.name);

  // 配置
  private readonly DEGPT_URL = 'https://degpt.ai/api/v1/chat/completion/proxy';
  private readonly DEGPT_TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjB4ZGU4Nzg0MDExZTFDODY0RTM3Njk3ZmFFMjhhNkUxOWFlNEU2REQ5ZCIsImV4cCI6MTc2OTY3ODk0Mn0.yFJYgjMRU5V0t7pZeV4GM6PLZfHMcpv3if1d-k1bdEc';
  private readonly LLM_MODEL = 'gpt-5.2';
  private readonly WAVESPEED_URL = 'https://api.wavespeed.ai/api/v3';
  private readonly WAVESPEED_KEY = process.env.WAVESPEED_KEY || '';

  /**
   * 主入口
   */
  async runTest(
    originalPrompt: string,
    imageUrl?: string,
    enableOptimization: boolean = true,
    voiceId?: string,
    duration: number = 15, // 👈 [新增] 接收 duration 参数
  ) {
    this.logger.log(
      `>>> 启动流程 | Input: "${originalPrompt}" | Duration: ${duration}s | Optimization: ${enableOptimization}`,
    );

    // --- 0. 查找音色描述 ---
    let selectedVoiceDesc = '';
    if (voiceId) {
      const preset = ASIAN_MARKET_VOICES.find((v) => v.id === voiceId);
      if (preset) {
        selectedVoiceDesc = preset.description;
        this.logger.log(`[Voice] 用户指定音色: ${preset.name}`);
      }
    }

    // --- Step 1: 提示词处理 ---
    let prompts: OptimizedResult;

    if (enableOptimization) {
      // 开启优化：GPT 介入
      // ✅ [修改] 传入 imageUrl 和 duration
      prompts = await this.optimizePrompts(
        originalPrompt,
        selectedVoiceDesc,
        imageUrl,
        duration,
      );
    } else {
      prompts = {
        imageEditPrompt: originalPrompt,
        videoVisualPrompt: originalPrompt,
        videoAudioPrompt: `Voice Style: ${selectedVoiceDesc || 'Default'}`,
      };
      this.logger.log('提示词优化已关闭，使用原始输入。', prompts);
    }
    // throw new Error(
    //   '🚧 测试结束：主动停止，防止消耗 Nano Banana 和 Wan 2.6 的 Token 🚧',
    // );
    // --- Step 2: 修图师 (Nano Banana) ---
    // 🔥🔥🔥 [你的修复逻辑]：类型检查，防止 optimizedImageUrl 变成对象或 null
    let optimizedImageUrl = imageUrl;
    if (imageUrl && enableOptimization) {
      try {
        const result = await this.optimizeImage(
          imageUrl as any,
          prompts.imageEditPrompt,
        );
        // 只有当 result 是有效的 http 字符串时才覆盖，否则保持原图
        if (typeof result === 'string' && result.startsWith('http')) {
          optimizedImageUrl = result;
        } else {
          this.logger.warn(`[SmartEnhancer] 修图返回无效数据，回滚原图`);
        }
      } catch (e) {
        this.logger.error(`[SmartEnhancer] 修图失败: ${e.message}，回滚原图`);
      }
    }

    // 构造最终 Prompt (仅用于日志展示)
    const finalVideoPrompt = prompts.videoVisualPrompt;

    this.logger.log('提示词生成完毕', {
      originalInput: { prompt: originalPrompt, image: imageUrl },
      aiAnalysis: prompts,
      finalOutput: {
        videoPrompt: finalVideoPrompt,
        startFrame: optimizedImageUrl,
      },
    });

    return {
      originalInput: { prompt: originalPrompt, image: imageUrl },
      aiAnalysis: prompts,
      finalOutput: {
        videoPrompt: finalVideoPrompt,
        startFrame: optimizedImageUrl,
      },
    };
  }

  // =================================================================================================
  // 🔥 核心 A: GPT-5.2 智能导演逻辑 (产品一致性 + 创意发挥 + 英文提示词)
  // =================================================================================================
  async optimizePrompts(
    originalPrompt: string,
    fixedVoiceDesc?: string,
    imageUrl?: string, // 👈 接收图片 URL
    duration: number = 15, // 👈 接收时长
  ): Promise<OptimizedResult> {
    // 1. 语言检测 (决定台词语言)
    const isChinese = /[\u4e00-\u9fa5]/.test(originalPrompt);
    const isKorean = /[\uac00-\ud7af]/.test(originalPrompt);

    let dialogueLang = 'English';
    if (isChinese) dialogueLang = 'Simplified Chinese (简体中文)';
    else if (isKorean) dialogueLang = 'Korean (한국어)';

    this.logger.log(
      `[Brain] GPT-5.2 导演构思中... 时长: ${duration}s | 台词语言: ${dialogueLang}`,
    );

    // 2. 音色准备
    let voiceInstruction = fixedVoiceDesc
      ? `User selected voice: "${fixedVoiceDesc}"`
      : `Select the BEST matching voice from: ${VOICE_MENU_PROMPT}`;

    // 3. 系统指令：灵活的商业导演
    const template = `
     Role: Expert Commercial Video Director & Cinematographer.
     Task: Generate a high-end ${duration}s product promotion video script for the Image-to-Video model.
 
     User Input: "${originalPrompt}"
     User Uploaded Product Image Link: "${imageUrl}"
     Target Language for Dialogue: **${dialogueLang}**
     ${voiceInstruction}
 
     ---
      1.  **NO SEARCHING:** Do not use Google, Knowledge Base, or any tools. Just write.
      2.  **OUTPUT JSON ONLY:** Return valid JSON without markdown formatting.

     ### 🛡️ CORE RULE: PRODUCT FIDELITY (HIGHEST PRIORITY)
     1.  **ABSOLUTE VISUAL PRESERVATION:** The user has provided a specific product image. **DO NOT change any characteristics of the original product.**
         * Do not change its color, material, texture, logo, or shape.
         * If the user prompt implies a change (e.g., "make the green cup red"), IGNORE IT regarding the product itself, but you can change the lighting to red. **The product itself must remain exactly as shown in the URL.**
     2.  **NO HALLUCINATION:** Do not invent visual details about the product that are not implied by the context of "keeping it original".
     3.  **INSTRUCTION:** In your output prompts, explicitly add: **"Keep the product exactly as in the reference image."**
 
     ---
     ### 🎨 CREATIVE FREEDOM (Atmosphere, Light & Camera)For example, below.
     *While the product remains static, everything else is your canvas.*
     
     1.  **CINEMATIC LIGHTING & MOOD:**
         * Don't just say "good lighting". Use professional terms: *e.g., Volumetric fog, Tyndall effect (God rays), Rim light (for separation), Bokeh (depth of field), Golden Hour, Neon Cyberpunk, or Soft High-key Studio lighting.*
         * Match the lighting to the product's vibe (e.g., Cozy warm light for coffee; Crisp cool light for tech).
     
     2.  **DYNAMIC CAMERA MOVEMENT(For example, below):**
         * Avoid static shots. Use specific moves: *Slow Dolly In (intimacy), Orbit/Arc (showing details), Rack Focus (shifting attention from background to product), Low Angle (heroic look), or FPV Drone (energetic).*
         * Ensure the movement flows logically from 0s to ${duration}s.
 
     3.  **ACTING & MICRO-EXPRESSIONS:**
         * Describe subtle human details: *A satisfied sigh, a micro-smile after sipping, eyes widening in surprise, fingers gently tracing the texture.* These sell the feeling.
 
     ---
     ### 🎬 DIRECTING GUIDELINES (Structure & Narrative)For example, below:
 
     1.  **CASTING & STYLING (Context is King):**
         * **Rule:** Analyze the product context first. The outfit MUST match the usage scenario.
             * *Gym/Sport:* Sportswear/Leggings/Sweat.
             * *Home/Sleep:* Comfy loungewear/Oversized hoodie.
             * *Office/City:* Sharp Suits/Smart Casual/Fashionable wear.
         * **Aesthetic:** Prefer **Young Asian Models (20-26)** unless the product dictates otherwise. Favor a "High-End Trendy" look to show sophistication ("气质").
 
     2.  **PACING & STRUCTURE (${duration}s):**
         * **0-${Math.floor(duration * 0.3)}s (The Hook):** Visual impact. Macro shot of the product texture or an intriguing opening action. Rack focus or fast cut.
         * **${Math.floor(duration * 0.3)}-${Math.floor(duration * 0.8)}s (The Experience):** The character interacts with the product. This is where the **Dialogue** happens. Show the benefit/feeling.
         * **${Math.floor(duration * 0.8)}-${duration}s (The Payoff):** Emotional reaction (smile/satisfaction) + Final Hero Shot of the product with branding.
 
     3.  **DIALOGUE & AUDIO:**
         * **Dialogue:** Generate a natural, spoken line (approx 10-15 words for 5s, 30-40 words for 15s). It shouldn't sound like a robot reading a spec sheet. It should sound like a friend sharing a discovery.
         * **Syntax:** "... **The character @[Voice_Description] says 'Your_Dialogue_Here'** ..."
         * **Audio Design:** detailed BGM mood (e.g., "Lo-fi beats", "Upbeat Pop") and specific SFX (e.g., "Ice clinking", "City ambience", "Fabric rustling").
 
     4.  **Sound Effects and Background Music:**
         * **Add sound effects and background music that match the scene and plot.
        
 
     ---
     ### 📝 OUTPUT LANGUAGE REQUIREMENTS (STRICT)
     1.  **Visual Prompts (imageEditPrompt & videoVisualPrompt):** MUST be written in **ENGLISH**.
     2.  **Audio Prompt:** MUST be written in **ENGLISH**.
     3.  **Dialogue (inside videoVisualPrompt):** * The spoken line inside 'says "..."' MUST be strictly in **${dialogueLang}**.
         * **CRITICAL RULE:** Even though the surrounding prompt is English, **DO NOT translate the dialogue**.
         * If Target is Chinese -> Character says "这个产品真棒" (Keep Chinese).
         * If Target is English -> Character says "This product is amazing".
         * If the target language is Korean, the character's dialogue should be in Korean.
 
     ---
     **JSON OUTPUT ONLY**:
     {
       "imageEditPrompt": "High-quality English description for static image generation. Focus on lighting, background, and composition. MUST include: 'Keep the original product appearance exactly as in the reference image'.", 
       
       "videoVisualPrompt": "Detailed ${duration}s visual flow in ENGLISH. Use syntax: '0-${Math.floor(duration * 0.3)}s (Hook)...'. Include camera moves. For dialogue use syntax: 'The character @[Voice_Description] says \"(Insert Dialogue in ${dialogueLang} here)\"'. MUST include: 'Keep the original product appearance exactly as in the reference image'.",
       
       "videoAudioPrompt": "BGM: ... / SFX: ... (In English)" 
     }
     `;

    // 4. Fetch 定义 (保持不变)
    const fetchWithRetry = async (
      url: string,
      options: any,
      retries = 2,
    ): Promise<Response> => {
      let lastError: any;
      for (let i = 0; i < retries; i++) {
        try {
          const res = await fetch(url, options);
          if (res.status === 504 || res.status === 502)
            throw new Error(`Gateway Timeout ${res.status}`);
          if (!res.ok) return res;
          return res;
        } catch (err) {
          lastError = err;
          if (i === retries - 1) throw lastError;
          this.logger.warn(`GPT Retrying (${i + 1}/${retries})...`);
        }
      }
      throw lastError || new Error('Fetch failed unknown error');
    };

    try {
      const response = await fetchWithRetry(this.DEGPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.DEGPT_TOKEN}`,
        },
        body: JSON.stringify({
          model: this.LLM_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful JSON generator assistant. You strictly output JSON. You DO NOT have access to external search tools or knowledge bases.',
            },
            { role: 'user', content: template },
          ],
          stream: false,
          project: 'DecentralGPT',
          enable_thinking: false,
          tool_choice: 'none',
          max_tokens: 10000,
          temperature: 0.85, // 稍微调高一点，增加创意的多样性
        }),
      });

      const textResponse = await response.text();
      // 🔥🔥🔥 [新增] 调试日志：打印 GPT 到底返回了什么鬼东西
      this.logger.log(
        `[Debug] Raw GPT Response: ${textResponse.slice(0, 500)}`,
      );
      let content = '';
      try {
        const data = JSON.parse(textResponse);
        content =
          data?.choices?.[0]?.message?.content ||
          data?.output?.[0]?.content?.[0]?.text ||
          '';
      } catch (e) {
        throw new Error(`Invalid JSON Response`);
      }

      // 清洗 JSON
      let cleanContent = content
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      const match = cleanContent.match(/\{[\s\S]*\}/);
      if (match) cleanContent = match[0];

      const result = JSON.parse(cleanContent);
      if (!result.videoVisualPrompt)
        throw new Error('Missing videoVisualPrompt');

      return result;
    } catch (e) {
      this.logger.error(`GPT 导演罢工: ${e.message}`);

      // --- ⚡ 兜底策略 (Fallback) ---
      const basePrompt = `Cinematic 8k shot, Young Asian Model (Trendy/Fashionable style), interacting with the product: ${originalPrompt}, cinematic lighting, high detail. Keep the original product appearing exactly as in the reference image.`;

      const fallbackVisual = fixedVoiceDesc
        ? `${basePrompt}. The character @${fixedVoiceDesc} says "This is amazing product quality." (Lip-sync active). Duration: ${duration}s.`
        : `${basePrompt}. Slow dolly in, premium commercial look.`;

      return {
        imageEditPrompt: basePrompt,
        videoVisualPrompt: fallbackVisual,
        videoAudioPrompt:
          'Cinematic commercial background music, upbeat and modern.',
      };
    }
  }

  // ==========================================
  // 图片优化 (Nano Banana Pro)
  // ==========================================
  async optimizeImage(imageUrl: string, prompt: string): Promise<string> {
    this.logger.log(`[Image] 提交给 Nano Banana Pro (4K)...`, prompt);
    try {
      const payload = {
        prompt: prompt,
        images: [imageUrl],
        resolution: '2k',
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

      return await this.pollImageResult(requestId, imageUrl);
    } catch (e) {
      this.logger.error('图片优化异常', e);
      return imageUrl;
    }
  }

  private async pollImageResult(
    requestId: string,
    originalUrl: string,
  ): Promise<string> {
    const maxRetries = 60;
    const interval = 2000;
    for (let i = 0; i < maxRetries; i++) {
      await new Promise((r) => setTimeout(r, interval));
      try {
        const res = await fetch(
          `${this.WAVESPEED_URL}/predictions/${requestId}/result`,
          {
            headers: { Authorization: `Bearer ${this.WAVESPEED_KEY}` },
          },
        );
        if (!res.ok) continue;
        const json = await res.json();
        // 🔥🔥🔥 [之前保留的逻辑] 确保返回的是字符串，否则返回原图
        if (json?.data?.status === 'completed') {
          const out = json.data.outputs?.[0];
          if (typeof out === 'string') return out;
        }
        if (json?.data?.status === 'failed') return originalUrl;
      } catch (e) {}
    }
    return originalUrl;
  }
}
