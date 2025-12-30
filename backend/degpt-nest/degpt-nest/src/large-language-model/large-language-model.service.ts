import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateLargeLanguageModelDto } from './dto/create-large-language-model.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LargeMode } from './schemas/creatimg-schema';
import { usePika } from '@/hook/usepika';
import { useWan } from '@/hook/useWan';
import { useSam3 } from '@/hook/useSam3';

@Injectable()
export class LargeLanguageModelService {
  constructor(
    @InjectModel(LargeMode.name) private catModel: Model<LargeMode>,
  ) {}

  async create(createCatDto: CreateLargeLanguageModelDto) {
    let requestId: string;

    switch (createCatDto.model) {
      // =========================================================
      // 🟢 Case A: Pika V2.2
      // =========================================================
      case 'pika':
        const { submitTask: submitPika } = usePika();
        requestId = await submitPika({
          prompt: createCatDto.prompt,
          images: createCatDto.images!,
          resolution: createCatDto.resolution,
          seed: createCatDto.seed,
          transitions: createCatDto.transitions,
        });
        break;

      // =========================================================
      // 🔵 Case B: Wan 2.1 (参数已补全)
      // =========================================================
      case 'wan-2.1':
        const { submitWanTask } = useWan();

        requestId = await submitWanTask({
          // ==========================================
          // 🔴 必填核心参数
          // ==========================================

          // [必填] 源视频 URL
          // 作用：生成的“底片”，AI 会基于它的构图和动作进行重绘
          video: createCatDto.video!,

          // [必填] 正向提示词
          // 作用：描述你希望生成什么样子的视频（例如“吉卜力风格，阳光明媚”）
          prompt: createCatDto.prompt,

          // ==========================================
          // 🟡 画面控制参数 (可选)
          // ==========================================

          // [可选] 负向提示词
          // 作用：描述你不希望出现的元素（例如“模糊、低画质、变形”）
          negative_prompt: createCatDto.negative_prompt,

          // [可选] 风格模型 (LoRA)
          // 限制：数组最多包含 3 个项目 (Max 3 items)
          // 结构：{ path: string, scale: number }
          // ⚠️ scale 取值范围：0.0 ~ 4.0
          loras: createCatDto.loras,

          // [可选] 重绘幅度 (Denoising Strength)
          // 类型：Float (浮点数)
          // 范围：0.10 ~ 1.00
          // 默认：0.9
          // 说明：0.1=微调(几乎不变)，1.0=完全重绘(不看原视频)。推荐 0.6~0.9。
          strength: createCatDto.strength,

          // ==========================================
          // 🔵 技术/质量参数 (可选)
          // ==========================================

          // [可选] 推理步数 (Inference Steps)
          // 类型：Integer (整数)
          // 范围：1 ~ 40
          // 默认：30
          // 说明：步数越高画质越细腻，但生成时间越长。通常 30 够用。
          num_inference_steps: createCatDto.num_inference_steps,

          // [可选] 视频时长 (Duration)
          // 类型：Integer (整数)
          // 范围：5 ~ 10 (单位：秒)
          // 默认：5
          // 说明：目前只能生成 5 到 10 秒的视频。
          duration: createCatDto.duration,

          // [可选] 提示词相关性 (Guidance Scale / CFG)
          // 类型：Number (数字)
          // 范围：0.00 ~ 20.00
          // 默认：5
          // 说明：值越高，AI 越死板地遵循提示词；值越低，AI 越放飞自我。推荐 5~7。
          guidance_scale: createCatDto.guidance_scale,

          // [可选] 流动偏移 (Flow Shift)
          // 类型：Number (数字)
          // 范围：1.0 ~ 10.0
          // 默认：3
          // 说明：调节视频动态生成的节奏，影响画面过渡的自然程度。一般用默认值。
          flow_shift: createCatDto.flow_shift,

          // [可选] 随机种子 (Seed)
          // 类型：Integer (整数)
          // 范围：-1 ~ 2147483647
          // 默认：-1
          // 说明：-1 代表随机生成。如果填固定数字（如 1234），下次用同样的参数能生成一模一样的视频。
          seed: createCatDto.seed,
        });

        break;

      // =========================================================
      // 🟣 Case C: SAM3 Video (视频抠图/分割)
      // =========================================================
      case 'sam3':
        const { submitSam3Task } = useSam3();

        requestId = await submitSam3Task({
          // [必填] 源视频
          video: createCatDto.video!,

          // [必填] 目标物体 (例如 "person, car")
          prompt: createCatDto.prompt,

          // [可选] 是否抠图 (默认 true)
          // 这里的 createCatDto.apply_mask 已经在 DTO 校验过了
          apply_mask: createCatDto.apply_mask,
        });
        break;

      default:
        throw new BadRequestException('不支持的模型类型');
    }

    return { requestId };
  }

  async findOne(id: string) {
    // 假设查询接口通用，使用 usePika 或 useWan 的查询方法均可
    const { getResult } = usePika();
    return await getResult(id);
  }
}
