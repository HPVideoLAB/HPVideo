import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { CreateLargeLanguageModelDto } from './dto/create-large-language-model.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
// 引入修改后的 Schema (注意属性名已改为 modelName)
import { LargeMode, LargeModeDocument } from './schemas/creatimg-schema';
import { usePika } from '@/hook/usepika';
import { useWan } from '@/hook/useWan';
import { useSam3 } from '@/hook/useSam3';

@Injectable()
export class LargeLanguageModelService {
  private readonly logger = new Logger(LargeLanguageModelService.name);

  constructor(
    @InjectModel(LargeMode.name) private catModel: Model<LargeModeDocument>,
  ) {}

  // =======================================================
  // 1. 创建逻辑：调用 Hook -> 拿到 ID -> 存库
  // =======================================================
  async create(createCatDto: CreateLargeLanguageModelDto, userId: string) {
    let requestId: string;
    let thumbUrl = '';

    // --- A. 调用第三方 Hook (保持原有逻辑) ---
    try {
      switch (createCatDto.model) {
        case 'pika':
          const { submitTask: submitPika } = usePika();
          requestId = await submitPika({
            prompt: createCatDto.prompt,
            images: createCatDto.images!,
            resolution: createCatDto.resolution,
            seed: createCatDto.seed,
            transitions: createCatDto.transitions,
          });
          // Pika: 取第一张图做封面
          thumbUrl = createCatDto.images?.[0] || '';
          break;

        case 'wan-2.1':
          const { submitWanTask } = useWan();
          requestId = await submitWanTask({
            video: createCatDto.video!,
            prompt: createCatDto.prompt,
            negative_prompt: createCatDto.negative_prompt,
            loras: createCatDto.loras,
            strength: createCatDto.strength,
            num_inference_steps: createCatDto.num_inference_steps,
            duration: createCatDto.duration,
            guidance_scale: createCatDto.guidance_scale,
            flow_shift: createCatDto.flow_shift,
            seed: createCatDto.seed,
          });
          // Wan: 取视频链接做封面
          thumbUrl = createCatDto.video || '';
          break;

        case 'sam3':
          const { submitSam3Task } = useSam3();
          requestId = await submitSam3Task({
            video: createCatDto.video!,
            prompt: createCatDto.prompt,
            apply_mask: createCatDto.apply_mask,
          });
          // Sam: 取视频链接做封面
          thumbUrl = createCatDto.video || '';
          break;

        default:
          throw new BadRequestException('不支持的模型类型');
      }
    } catch (error) {
      this.logger.error(`Submit Error: ${error.message}`);
      throw new BadRequestException(error.message || '提交失败');
    }

    // --- B. 存入 MongoDB (新增逻辑) ---
    // 注意：这里将 createCatDto.model 赋值给 modelName，解决 TS 报错
    const newRecord = new this.catModel({
      requestId,
      userId,
      modelName: createCatDto.model, // 🔥 映射字段
      prompt: createCatDto.prompt,
      params: createCatDto, // 🔥 完整参数备份
      status: 'processing',
      thumbUrl,
      outputUrl: '',
    });

    await newRecord.save();
    this.logger.log(`Task Created: ${requestId} for user ${userId}`);

    return { requestId };
  }

  // =======================================================
  // 2. 轮询逻辑：查库 -> (如果不完整)查API -> 更新库
  // =======================================================
  async findOne(id: string) {
    // 1. 先查数据库
    const record = await this.catModel.findOne({ requestId: id });

    // 2. 优化：如果库里已经是完成状态，直接返回库里的数据 (不用调第三方API)
    if (
      record &&
      (record.status === 'completed' || record.status === 'failed')
    ) {
      return {
        id: record.requestId, // 保持前端结构兼容
        status: record.status,
        resultUrl: record.outputUrl, // 保持前端结构兼容
        raw: { status: record.status }, // 可选
      };
    }

    // 3. 库里没完成，或者是旧数据，调用 Hook 查询
    // (假设三个模型的查询接口通用，使用 usePika 即可)
    const { getResult } = usePika();
    let apiResult;

    try {
      apiResult = await getResult(id);
    } catch (e) {
      // 查询出错直接抛出，不更新数据库
      throw e;
    }

    // 4. 如果 Hook 返回状态变了，同步更新数据库
    if (record) {
      if (apiResult.status === 'completed') {
        record.status = 'completed';
        record.outputUrl = apiResult.resultUrl;
        await record.save();
        this.logger.log(`Task Completed via Polling: ${id}`);
      } else if (apiResult.status === 'failed') {
        record.status = 'failed';
        await record.save();
      }
    }

    return apiResult;
  }

  // =======================================================
  // 3. 获取历史列表 (新功能)
  // =======================================================
  async findAllByUser(userId: string) {
    if (!userId || userId === 'anonymous') return [];

    // 返回该用户的记录，按时间倒序
    return this.catModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }
}
