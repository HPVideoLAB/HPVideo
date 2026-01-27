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
  ) {
    this.logger.log(
      `>>> 启动流程 | Input: "${originalPrompt}" | VoiceID: ${voiceId} | Optimization: ${enableOptimization}`,
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
      prompts = await this.optimizePrompts(originalPrompt, selectedVoiceDesc);
    } else {
      prompts = {
        imageEditPrompt: originalPrompt,
        videoVisualPrompt: originalPrompt,
        videoAudioPrompt: `Voice Style: ${selectedVoiceDesc || 'Default'}`,
      };
      this.logger.log('提示词优化已关闭，使用原始输入。', prompts);
    }

    // --- Step 2: 修图师 (Nano Banana) ---
    let optimizedImageUrl = imageUrl;
    if (imageUrl && enableOptimization) {
      optimizedImageUrl = await this.optimizeImage(
        imageUrl,
        prompts.imageEditPrompt,
      );
    }

    // 构造最终 Prompt
    const finalVideoPrompt = enableOptimization
      ? `${prompts.videoVisualPrompt} -- Audio/BGM: ${prompts.videoAudioPrompt}`
      : `${originalPrompt} -- Audio: ${prompts.videoAudioPrompt}`;
    this.logger.log('提示词8888888', {
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
  // 🔥 核心 A: GPT-5.2 智能导演逻辑 (产品适配优先 + 亚洲时尚审美倾向)
  // =================================================================================================
  async optimizePrompts(
    originalPrompt: string,
    fixedVoiceDesc?: string,
  ): Promise<OptimizedResult> {
    // 1. 语言检测
    const isChinese = /[\u4e00-\u9fa5]/.test(originalPrompt);
    const isKorean = /[\uac00-\ud7af]/.test(originalPrompt);

    let targetLang = 'English';
    if (isChinese) targetLang = 'Simplified Chinese (简体中文)';
    else if (isKorean) targetLang = 'Korean (한국어)';

    this.logger.log(`[Brain] GPT-5.2 导演构思中 (Target: ${targetLang})...`);

    // 2. 音色准备
    let voiceInstruction = fixedVoiceDesc
      ? `User selected voice: "${fixedVoiceDesc}"`
      : `Select the BEST matching voice from: ${VOICE_MENU_PROMPT}`;

    // 3. 系统指令：灵活的商业导演
    const template = `
    Role: Expert Commercial Video Director (Specializing in Asian Markets).
    Task: Create a 15s product promotion script for Alibaba Wan 2.6 based on User Input.

    User Input: "${originalPrompt}"
    Target Language for Dialogue: **${targetLang}**
    ${voiceInstruction}

    ---
    ### 🎬 DIRECTING GUIDELINES (Flexible & Creative):

    1.  **CASTING & STYLING (Context is King):**
        * **Rule:** Analyze the product first. The outfit MUST match the usage scenario.
            * *Gym/Sport:* Sportswear/Leggings.
            * *Home/Sleep:* Comfy loungewear.
            * *Office/City:* Suits/Fashionable wear.
        * **Aesthetic Preference (If applicable):** * Prefer **Young Asian Models (20-26)**.
            * **If the setting allows (e.g., Office, Street, Party), favor a "High-End Trendy" look.** * *Style Inspiration:* Urban chic, sharp suits, or fashionable silhouettes (e.g., pencil skirts, stylish stockings, elegant dresses) to show sophistication ("气质"). **But only if it fits the product vibe.**

    2.  **NARRATIVE FLOW (15s Story):**
        * Create a coherent mini-story: **Hook (Show Product) -> Action (Interaction) -> Payoff (Satisfaction).**
        * **Camera:** Use dynamic cinematic moves (Slow Dolly, Orbit, Rack Focus). Avoid static shots.

    3.  **LONG DIALOGUE & COHERENT PLOT (15s Full Utilization):**
        * **Dialogue Length:** Generate a SUBSTANTIAL line (approx. 50-80 chars in CN/KR, 40-60 words in EN). It should cover 8-12 seconds of the 15s duration.
        * **Content:** Don't just say "It's good." Describe the feeling, the quality, or the lifestyle. 
        * **TECHNICAL SYNTAX (CRITICAL):**
            "... **The character @[Voice_Description] says 'Your_Long_Coherent_Dialogue_Here'** ..."
    
    4.  **VISUAL FLOW & CAMERA:**
        * **0-5s (The Hook):** Focus on product texture (Hero Shot). Camera: Rack Focus or Slow Dolly.
        * **5-15s (The Interaction):** Character interacts with the product while delivering the long dialogue. 
        * **Details:** Include micro-dynamics (Blinking, subtle breathing, liquid ripples, fabric moving).

    5.  **AUDIO:**
        * Select BGM/SFX that matches the scene mood (e.g., Upbeat, Relaxing, Luxury).

    ---
    **JSON OUTPUT ONLY**:
    {
      "imageEditPrompt": "Detailed static shot description (8k, cinematic lighting)...", 
      "videoVisualPrompt": "15s visual flow with Camera Moves + 'Subject @Voice says Dialogue' syntax...",
      "videoAudioPrompt": "BGM: ... / SFX: ..." 
    }
    `;

    // 4. Fetch 定义 (带重试 & 类型安全)
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
          messages: [{ role: 'user', content: template }],
          stream: false,
          project: 'DecentralGPT',
          enable_thinking: false,
          max_tokens: 2048,
          temperature: 0.75, // 保持一定的创意度
        }),
      });

      const textResponse = await response.text();

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
      // 如果 GPT 挂了，我们依然给一个比较稳的“亚洲时尚”默认值
      // 这里的描述是“泛用型”的，既不违和也有美感
      const basePrompt = `Cinematic 8k shot, Young Asian Model (Trendy/Fashionable style), holding/using the product: ${originalPrompt}, cinematic lighting, high detail`;

      const fallbackVisual = fixedVoiceDesc
        ? `${basePrompt}. The character @${fixedVoiceDesc} says "This is amazing." (Lip-sync active).`
        : `${basePrompt}. Slow dolly in, premium commercial look.`;

      return {
        imageEditPrompt: basePrompt,
        videoVisualPrompt: fallbackVisual,
        videoAudioPrompt: 'Cinematic commercial background music',
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
        resolution: '1k',
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
        if (json?.data?.status === 'completed') return json.data.outputs[0];
        if (json?.data?.status === 'failed') return originalUrl;
      } catch (e) {}
    }
    return originalUrl;
  }
}
