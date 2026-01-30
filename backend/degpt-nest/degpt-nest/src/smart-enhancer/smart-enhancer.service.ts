import { Injectable, Logger } from '@nestjs/common';
// ✅ 引入刚刚更新的音色库
import {
  ASIAN_MARKET_VOICES,
  VOICE_MENU_PROMPT,
} from '@/constants/voice-presets';
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
视频总时长: ${duration}秒.
用户原始提示词: "${originalPrompt}"
产品图片链接: "${imageUrl}"
人物对话语言: ${dialogueLang}
人物音色：${fixedVoiceDesc}，

角色：你是一位顶级产品宣传广告视频导演 + 摄影师 + 音效背景音乐设计师
目标：基于用户上传的产品图片和用户原始提示词，分别创建优化后的图片提示词和优化后的视频提示词。
(1) imageEditPrompt: (用于优化用户上传的产品图片提示词) -> 始终用英文描述.
(2) videoVisualPrompt: (用于生成最后的视频) -> 最终的提示词语言和${lang}保持一致.



1,设计期间必须遵守的规则（必须遵守）
(1)， 产品保持不变(你只需要图片提示词和视频提示词开头说一遍就好了)
用户上传的产品图片外观必须保持不变，因此你必须在图片提示词和视频提示词中首先明确提出“保持产品外观，不改变任何细节”，以防止生成的图片和视频和用户想要的产品不一致的问题。
(2)，人物对话规则
语言：人物说的话必须和${dialogueLang}一致。
格式：如果用户原始提示词是中文，那么说话的时候必须像这样，（假设人物是张丽，说的话是大家好我是新来的同学我叫张丽），那么必须这么触发，“张丽，@音色是${fixedVoiceDesc}，说：大家好我是新来的同学我叫张丽”，必须是人物后面加@再加音色，然后触发关键的一个“说”字，这样后续的视频大模型理解的更准确，如果是韩语则规则也一样不过说的话就是韩语，如果是其他语言统一就是英文规则也一样。
(3)，必须包含和你设计的剧情匹配的背景音乐和音效
(4)，尽可能出现人物
视频里包含人物的话会让整个视频更加丰富，人物形象尽量选择亚洲 20 岁到 26 岁的年轻人，最好选择年轻的韩国欧巴和顶流明星，因为我们的用户大多韩国人居多，但具体的人物形象还是得结合你设计的剧情匹配。


2， 创意目标（首先，你可以先搜索当前主流产品宣传广告视频是怎样的，当前主流社交媒体博主比如抖音，比如 tiktok 等 是如何宣传产品来卖的，得到这些信息之后更利于你编写提示词，你就可以大胆发挥了(比如利用网络热梗，中文的家人们，宝子们，小哥哥小姐姐，英文的hei bro，韩语的阿西吧等等来让视频更有画面感，因为那些博主们就是这么选穿的，你可以借鉴一下)，你在这里有很大的发挥空间，但我给你说一下需要注意的点比如下面的。）
(1)你可以根据产品来设计剧情，然后有对应的色调，运镜技巧，转场特效，光线等等因为我看到人家产品宣传视频里有这些哈哈。
(2)人物对话要情感细腻，不生硬，表情要自然，剧情要自然而然流畅合理，看完给人感觉就很对这个产品感兴趣，很想买这个产品。
(3)人物的台词也需要和你设计的剧情匹配，并且要在总时长内说完，不要视频快要结束了人物台词还没说完，而且说的时候要有感情。



3，仅输出 JSON(这是最重要的只输出json,不要输出其他任何多余的内容)：
{
  "imageEditPrompt": "你生成的英文图片提示词",
  "videoVisualPrompt": "你生成的${lang}视频提示词"
}

`.trim();

    try {
      const openai = new UseOpenAI();
      const systemPrompt =
        'You are a JSON-only assistant. Output valid JSON only. No markdown. No external tools or browsing.';

      const content = await openai.callGPT52WithRetry(systemPrompt, template, {
        verbosity: 'medium',
        maxTokens: 3600,
        temperature: 0.66,
      });

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

      console.log(JSON.stringify(result));
      return result as OptimizedResult;
    } catch (e: any) {
      // 兜底：更像“品牌大片 + 真实带货”，且不写暧昧、不过度滤镜参数、台词短

      return {
        imageEditPrompt: '',
        videoVisualPrompt: '',
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
