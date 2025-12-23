import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateLargeLanguageModelDto } from './dto/create-large-language-model.dto';
import { UpdateLargeLanguageModelDto } from './dto/update-large-language-model.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LargeMode } from './schemas/creatimg-schema';
import { usePika } from '@/hook/usepika';

@Injectable()
export class LargeLanguageModelService {
  constructor(
    @InjectModel(LargeMode.name) private catModel: Model<LargeMode>,
  ) {}

  async create(createCatDto: CreateLargeLanguageModelDto) {
    //     一、Pika V2.2 Pikaframes 支持的参数（你需要的那部分）
    // 1️⃣ 提交任务参数（POST /pika/v2.2-pikaframes）
    // 参数名	必填	取值 / 范围	作用说明
    // images	✅	2 ~ 5 个 URL	关键帧图片。
    // 2 张 = 起点 → 终点；
    // 多张 = 按顺序作为关键帧
    // prompt	❌（但强烈建议）	string	全局描述：风格、镜头、氛围、动作
    // transitions	❌	数组，长度 = images.length - 1	每一段关键帧之间的动画控制
    // └ duration	条件必填	秒，≤ 25 总和	这一段持续多长时间
    // └ prompt	❌	string	覆盖/增强该段的局部提示词
    // resolution	❌	720p / 1080p	输出视频分辨率
    // seed	❌	-1 或整数	随机性控制，-1 每次不同

    // 📌 重要规则（你现在已经踩过）

    // images 必须 ≥ 2

    // images ≤ 5

    // transitions.length === images.length - 1

    // transitions.duration 总和 ≤ 25 秒

    // 不传 transitions → 默认 5 秒视频

    // "status": "completed",
    const { submitTask } = usePika();

    const requestId = await submitTask({
      prompt: createCatDto.prompt,
      images: createCatDto.images,
      resolution: createCatDto.resolution,
      seed: -1,
      transitions: [{ duration: 5 }],
    });

    return { requestId };
  }

  async findAll(): Promise<LargeMode[]> {
    return this.catModel.find().exec();
  }

  async findOne(id: any) {
    const { getResult } = usePika();
    return await getResult(id);
  }

  update(id: any, updateLargeLanguageModelDto: UpdateLargeLanguageModelDto) {
    return `This action updates a #${id} largeLanguageModel`;
  }

  remove(id: number) {
    return `This action removes a #${id} largeLanguageModel`;
  }
}
