import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { CreateLargeLanguageModelDto } from './dto/create-large-language-model.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
// ✅ 引入正确的 Model (确保你已经统一成了 LargeMode)
import { LargeMode, LargeModeDocument } from './schemas/creatimg-schema';

import { usePika } from '@/hook/usepika';
import { useModelDispatcher } from '@/hook/useModelDispatcher';
import { useCommercialPipelineRunner } from '@/hook/useCommercialPipelineRunner';
import { SmartEnhancerService } from '@/smart-enhancer/smart-enhancer.service';

@Injectable()
export class LargeLanguageModelService {
  private readonly logger = new Logger(LargeLanguageModelService.name);

  constructor(
    @InjectModel(LargeMode.name) private catModel: Model<LargeModeDocument>,
    private readonly smartEnhancerService: SmartEnhancerService,
  ) {}

  // =======================================================
  // 1. 创建任务 (Create)
  // =======================================================
  async create(createCatDto: CreateLargeLanguageModelDto, userId: string) {
    const dto: any = createCatDto;
    const { txHash, model } = dto;

    if (!txHash) throw new BadRequestException('支付凭证丢失');

    // 🛡️ 幂等性检查
    const record = await this.catModel.findOne({ txHash });
    if (record) {
      if (record.status === 'processing' || record.status === 'completed') {
        throw new BadRequestException('该支付凭证已使用，请勿重复提交');
      }
      this.logger.log(`Retrying failed task for hash: ${txHash}`);
    }

    // 🔥🔥🔥 分支 A: Commercial Pipeline (新商业模型) 🔥🔥🔥
    if (model === 'commercial-pipeline') {
      // 实例化 Runner
      const { run } = useCommercialPipelineRunner();

      // 调用 Runner 的 run 方法
      // 注意：这里不需要 await 结果返回内容，Runner 内部会处理好返回 requestId
      return run({
        dto,
        record,
        userId,
        txHash,
        smartEnhancerService: this.smartEnhancerService,
        catModel: this.catModel,
      });
    }

    // 🔥🔥🔥 分支 B: 旧模型 (Pika, Wan2.1, Sam3 等) 🔥🔥🔥
    // 保持原有逻辑不动
    const needPromptModels = ['pika', 'wan-2.1', 'sam3', 'wan-2.6-i2v'];

    if (needPromptModels.includes(model)) {
      if (!dto.prompt || !dto.prompt.trim()) {
        throw new BadRequestException('该模型必须提供 prompt');
      }
    }

    let requestId = '';
    let thumbUrl = '';
    let finalStatus: 'processing' | 'failed' = 'processing';
    let errorMsg = '';

    try {
      const { submit } = useModelDispatcher();
      const r = await submit(dto);
      requestId = r.requestId;
      thumbUrl = r.thumbUrl;
    } catch (e: any) {
      this.logger.error(`Submit Error: ${e.message}`);
      finalStatus = 'failed';
      errorMsg = e.message || 'Unknown error';
      requestId = `err-${txHash.slice(-6)}-${Date.now()}`;
    }

    // 存库
    if (record) {
      record.requestId = requestId;
      record.status = finalStatus;
      record.modelName = model;
      record.userId = userId;
      record.params = dto;
      if (thumbUrl) record.thumbUrl = thumbUrl;
      record.outputUrl = '';
      await record.save();
    } else {
      const newRecord = new this.catModel({
        requestId,
        userId,
        txHash,
        modelName: model,
        prompt: dto.prompt,
        params: dto,
        status: finalStatus,
        thumbUrl,
        outputUrl: '',
      });
      await newRecord.save();
    }

    if (finalStatus === 'failed') {
      throw new BadRequestException(
        `服务提交失败 (${errorMsg})，凭证已记录，请稍后点击“重试”按钮。`,
      );
    }

    return { requestId };
  }

  // =======================================================
  // 2. 轮询状态 (FindOne)
  // =======================================================
  async findOne(id: string) {
    const record = await this.catModel.findOne({ requestId: id });

    if (!record) {
      throw new BadRequestException('任务不存在');
    }

    // 🔥🔥🔥 分支 A: Commercial Pipeline (只读模式) 🔥🔥🔥
    // 因为有 Cron Task 在后台跑，这里不需要再去调用 API 更新状态
    // 直接读数据库就是最新的
    if (record.modelName === 'commercial-pipeline') {
      const pipeline = (record.params as any)?.pipeline || {};

      // 前端需要知道当前到底在干嘛，所以返回 stage
      // record.status 会被 Cron Task 更新为 completed 或 failed
      return {
        id: record.requestId,
        status: record.status, // processing | completed | failed
        stage: pipeline.stage, // wan_submitted | upscaling | completed
        resultUrl: record.outputUrl, // 最终结果

        // 调试信息，前端可以根据 pending_stage 展示进度条文案
        raw: {
          pipelineStage: pipeline.stage,
          error: pipeline.error,
        },
      };
    }

    // 🔥🔥🔥 分支 B: 旧模型 (主动查询模式) 🔥🔥🔥
    // 旧模型可能没有 Cron Task，所以这里保留“查询时触发更新”的逻辑
    if (record.status === 'completed' || record.status === 'failed') {
      return {
        id: record.requestId,
        status: record.status,
        resultUrl: record.outputUrl,
        raw: { status: record.status },
      };
    }

    // 兼容性代码：使用 Wavespeed 通用查询接口
    const { getResult } = usePika();
    const apiResult = await getResult(id);

    if (apiResult.status === 'completed') {
      record.status = 'completed';
      record.outputUrl = apiResult.resultUrl as any;
      await record.save();
    } else if (apiResult.status === 'failed') {
      record.status = 'failed';
      await record.save();
    }

    return apiResult;
  }

  // =======================================================
  // 3. 获取历史
  // =======================================================
  async findAllByUser(userId: string) {
    if (!userId || userId === 'anonymous') return [];
    return this.catModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }
}
