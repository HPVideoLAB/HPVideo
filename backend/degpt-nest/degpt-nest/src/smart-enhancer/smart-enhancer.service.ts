import { Injectable, Logger } from '@nestjs/common';
// ✅ 引入刚刚更新的音色库
import { ASIAN_MARKET_VOICES } from '@/constants/voice-presets';
// ✅ 引入 OpenAI Hook
import { UseOpenAI } from '@/hook/useopenai';

export interface OptimizedResult {
  videoVisualPrompt: string; // 画面 (包含 @音色 台词指令)
  imageEditPrompt: string; // 修图
}

@Injectable()
export class SmartEnhancerService {
  private readonly logger = new Logger(SmartEnhancerService.name);

  // 配置
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

    // ==============================================================
    // 🔥 1. 先进行语言检测 (用于决定选择哪种语言的音色描述)
    // ==============================================================
    const isChinese = /[\u4e00-\u9fa5]/.test(originalPrompt);
    const isKorean = /[\uac00-\ud7af]/.test(originalPrompt);
    // 决定语言 Key： 'zh' | 'ko' | 'en'
    const langKey = isChinese ? 'zh' : isKorean ? 'ko' : 'en';

    // ==============================================================
    // 🔥 2. 根据语言 Key 查找对应的音色描述
    // ==============================================================
    let selectedVoiceDesc = '';
    if (voiceId) {
      const preset = ASIAN_MARKET_VOICES.find((v) => v.id === voiceId);
      if (preset) {
        // ✅ 核心修改：根据语言取值，如果对应语言没有（理论上都有），回退到英文
        // @ts-ignore (如果 TS 报错说类型不匹配，因为我们刚改了结构)
        selectedVoiceDesc =
          preset.description[langKey] || preset.description.en || '';

        this.logger.log(
          `[Voice] 用户指定音色: ${preset.name} | 匹配语言: ${langKey}`,
        );
        this.logger.debug(`[Voice Desc]: ${selectedVoiceDesc.slice(0, 50)}...`);
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
  // 🔥 核心 A: GPT-5.2 智能导演逻辑 (产品一致性 + 创意发挥 + 统一输出规范)
  // ✅ imageEditPrompt 永远英文
  // ✅ videoVisualPrompt：中文/韩语/英文（跟随用户输入语言）
  // ✅ 强制对齐音色：
  //    - fixedVoiceDesc 有值：固定使用并压缩成短标签
  //    - fixedVoiceDesc 无值：必须从 ASIAN_MARKET_VOICES 菜单选择 voiceId，并用该 voiceId 生成短标签（不允许自造）
  // ✅ 5 段时间切片 + 2000-3200 字符范围
  // ✅ 台词时长：让 GPT 按剧情分配，但要求“可在 15s 内自然说完”，不要过多、不要拖尾
  // ✅ 人物偏好：尽量加入 20–26 亚洲帅哥/美女（可“顶流/明星感”），有台词时至少 1 段可见上半身/侧脸/轮廓（不要求全脸）
  // ✅ 不再硬指定“带货主播/清爽感”等具体风格词，让 GPT 自己决定
  // =================================================================================================

  async optimizePrompts(
    originalPrompt: string,
    fixedVoiceDesc?: string, // ✅ 你会传 voice.description 进来
    imageUrl?: string,
    duration: number = 15,
  ): Promise<OptimizedResult> {
    // 1) 语言检测（决定视频 prompt 语言 + 台词语言）
    const isChinese = /[\u4e00-\u9fa5]/.test(originalPrompt);
    const isKorean = /[\uac00-\ud7af]/.test(originalPrompt);

    type Lang = 'zh' | 'ko' | 'en';
    const lang: Lang = isChinese ? 'zh' : isKorean ? 'ko' : 'en';

    const dialogueLang =
      lang === 'zh'
        ? 'Simplified Chinese (简体中文)'
        : lang === 'ko'
          ? 'Korean (한국어)'
          : 'English';

    // 4) 系统指令模板：保留不可变规则，但把“导演感/带货感”写清楚
    //    重点：不再固定每段秒数；仍要求 5 段结构 + 每段都含 Visual/Transition/SFX/Dialogue；
    //    让 GPT 自己分配节奏，并要求“台词可在 duration 秒内说完”。
    const template = `
角色：你是一位顶级的产品宣传广告视频导演 + 摄影师 + 音效背景音乐设计师，并且你非常熟悉现在的短视频比如抖音，TikTok，YouTube博主带货视频风格。
目标：基于用户上传的产品图片和用户原始提示词，分别创建优化后的带货图片提示词和优化后的带货视频提示词。
(1) imageEditPrompt: (用于优化用户上传的产品图片提示词) -> 始终用英文描述.
(2) videoVisualPrompt: (用于生成最后的视频) -> 最终的提示词语言和${lang}保持一致.

用户给你的数据(你可以把用户上传的图片链接打开看看长什么样，再结合用户提示词进行后续设计)：
视频总时长: ${duration}秒.
用户原始提示词: "${originalPrompt}"
产品图片链接: "${imageUrl}"
人物对话语言: ${dialogueLang}
人物音色风格：${fixedVoiceDesc}，


1,设计期间必须遵守的规则（必须严格遵守以下6点）

(1)， 产品保持不变(你只需要图片提示词和视频提示词开头说一遍就好了)
用户上传的产品图片外观必须保持不变，因此你必须在图片提示词和视频提示词中首先明确提出“保持产品外观，不改变任何细节”，以防止生成的图片和视频和用户想要的产品不一致的问题。

(2),图片提示词和视频提示词必须场景相似，不能分歧太大，比如：如果视频里面有设计人物的话，那么图片里面必须有人物，因为生成视频模型就是根据我们的图片提示词来生成的，这两者越关联紧密，生成的视频越是能达到好的效果。

(3)，视频提示词里人物的台词对话规则
台词语言：人物说的话必须和${dialogueLang}一致
格式：如果用户原始提示词是中文，那么说话的时候必须像这样，（假设人物是一位可爱的女孩子，说的话是大家好我是新来的同学，请大家多多关照），那么必须像这么触发，“一位可爱的女孩子，@音色是[${fixedVoiceDesc}]，说：大家好我是新来的同学，请大家多多关照”，必须是人物后面加@再加音色，然后触发关键的一个“说”字，这样后续的视频大模型理解的更准确，如果是韩语则规则也一样不过说的话就是韩语，如果是其他语言统一就是英文规则也一样。

(4)，视频提示词里必须包含和你设计的剧情匹配的背景音乐和音效

(5)，视频提示词里尽可能出现人物,而且人物要和用户选择的音色匹配，比如：不要音色是温柔的人物却是男的，这就会导致不匹配（但是如果用户指定的视频总时长是10s以下就不要出现人物了，不然最终视频就会很不合理,视频总时长大于等于10s才出现人物）
视频里包含人物的话会让整个视频更加丰富，人物形象描述的话你自己根据用户上传的图片链接，和结合你设计的剧情，匹配人物形象，但是人物形象要真实现实一点，绝不能有AI感，要像真人一点。

(6)，视频提示词里人物的对话台词，剧情，背景音乐，音效必须在用户指定的总时长${duration}秒内完成，剧情不要多也不要少才合适（比如用户指定的视频总时长是5秒那么我们就在4s左右完成剧情，10s就在9s左右完成剧情，15s就在14s左右完成剧情）
绝对不能出现用户指定的时长是5s，却设计了超过5s的剧情和人物对话台词，要做到在用户规定的时长内完成剧情


2， 创意风格（首先，你一定要先搜索当前主流产品宣传广告视频是怎样的，我给你提供思路，你可以根据主流社交媒体比如抖音，比如 tiktok， YouTube等那些博主的带货宣传视频的风格，他们是如何宣传产品来卖的，得到这些数据之后，我们直接模仿写提示词就行了，还有你可以实时搜索当前流行的网络热梗加入它们到人物对话里，来让视频更有画面感），还要注意以下几点 。
(1)视频风格，你可以参考抖音，TikTok，YouTube博主的带货视频风格，还可以有适合的色调，运镜，转场特效，光线等等。但是具体的你自己设计就行了，但是要确保整个视频剧情没有违和感，不突兀。
(2)人物和人物对话台词要情感细腻，有情感，人物对话时表情不生硬，要自然，剧情要自然而然流畅合理，看完给人感觉就很对这个产品感兴趣，很想买这个产品。


3，仅输出 JSON(这是最重要的只输出json,不要输出其他任何多余的内容)：
{
  "imageEditPrompt": "你生成的英文图片提示词",
  "videoVisualPrompt": "你生成的${lang}视频提示词"
}

`.trim();

    try {
      const openai = new UseOpenAI();
      const systemPrompt =
        'You are a JSON-only assistant. Output valid JSON only. ';

      const content = await openai.callGPT52WithRetry(systemPrompt, template, {
        verbosity: 'medium',
        maxTokens: 3600,
        temperature: 0.66,
      });

      console.log('contentcontentcontent', JSON.stringify(content));
      // 清洗 JSON
      let cleanContent = content
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      const match = cleanContent.match(/\{[\s\S]*\}/);
      if (match) cleanContent = match[0];

      const result = JSON.parse(cleanContent);

      if (!result?.videoVisualPrompt)
        throw new Error('Missing videoVisualPrompt');
      if (!result?.imageEditPrompt) throw new Error('Missing imageEditPrompt');
      console.log('提示词生成成功');
      return result as OptimizedResult;
    } catch (e: any) {
      this.logger.error(
        `[GPT Error] OpenAI 优化失败，启用英文兜底: ${e.message}`,
      );

      // --- 1. 兜底图片提示词 (通用电商高质感) ---
      // 强调：专业摄影、4k、影棚光、清晰聚焦
      const fallbackImagePrompt = `Professional product photography of ${originalPrompt}. High resolution, 4k, studio lighting, clean background, photorealistic, sharp focus, cinematic lighting, commercial quality.`;

      // --- 2. 兜底视频提示词 (包含音色指令) ---
      let dialoguePart = '';

      // ⚠️ 关键：如果用户选了音色，必须手动拼接 @音色 指令，否则视频会哑巴
      // 既然 GPT 挂了，就直接让人物念出“用户原始输入的 Prompt”作为临时台词
      if (fixedVoiceDesc) {
        // 格式严格遵守：角色 @音色是XXX 说：内容
        dialoguePart = `\n\nNarrator, @Voice is ${fixedVoiceDesc}, says: "${originalPrompt}"`;
      }

      const fallbackVideoPrompt = `Cinematic product commercial video for ${originalPrompt}.
    High quality, 4k, highly detailed.
    Camera movement: Slow dolly in, smooth pan, elegant transitions.
    Lighting: Soft studio lighting, professional color grading.
    Sound: Background music is upbeat and modern commercial style.${dialoguePart}`;

      this.logger.warn('⚠️ 已使用兜底提示词生成', {
        fallbackImagePrompt,
        fallbackVideoPrompt,
      });

      return {
        imageEditPrompt: fallbackImagePrompt,
        videoVisualPrompt: fallbackVideoPrompt,
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
