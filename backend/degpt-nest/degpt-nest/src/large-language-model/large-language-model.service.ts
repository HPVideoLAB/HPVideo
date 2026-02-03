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
import { SSEConnectionManager } from './sse-connection.manager';

@Injectable()
export class LargeLanguageModelService {
  private readonly logger = new Logger(LargeLanguageModelService.name);

  constructor(
    @InjectModel(LargeMode.name) private catModel: Model<LargeModeDocument>,
    private readonly smartEnhancerService: SmartEnhancerService,
    private readonly sseConnectionManager: SSEConnectionManager,
  ) {}

  // =======================================================
  // 1. 创建任务 (Create)
  // =======================================================
  async create(createCatDto: CreateLargeLanguageModelDto, userId: string) {
    const dto: any = createCatDto;
    const { txHash, model } = dto;

    if (!txHash) throw new BadRequestException('Payment proof missing');

    // 🛡️ 幂等性检查 + 智能复活逻辑 (Cost Saver)
    const record = await this.catModel.findOne({ txHash });

    if (record) {
      // -----------------------------------------------------
      // 情况 1: 任务已完成
      // -----------------------------------------------------
      if (record.status === 'completed') {
        throw new BadRequestException(
          'This payment proof has been used, please do not resubmit',
        );
      }

      // -----------------------------------------------------
      // 情况 2: 任务正在进行中 (Processing)
      // -----------------------------------------------------
      if (record.status === 'processing') {
        // 计算耗时
        const createdAt = (record as any).createdAt || new Date();
        const now = new Date();
        const ageInMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;

        // 特殊情况：如果 Pipeline 跑了很久还没有 wanRequestId，说明之前卡死了，允许往下走去重试
        if (record.modelName === 'commercial-pipeline') {
          const pipeline = (record.params as any)?.pipeline;
          if (!pipeline?.wanRequestId && ageInMinutes > 5) {
            this.logger.warn(
              `Task ${record.requestId} stuck in processing without ID, allowing retry.`,
            );
            // 不返回，允许代码向下执行重新提交
          } else {
            return { requestId: record.requestId };
          }
        }
        // 其他情况直接返回 ID
        else {
          return { requestId: record.requestId };
        }
      }

      // -----------------------------------------------------
      // 情况 3: 任务失败 (Failed) - 🔥 省钱逻辑核心 🔥
      // -----------------------------------------------------
      if (record.status === 'failed') {
        let hasValidExternalId = false;

        // A. 检查 Commercial Pipeline (Wan 2.6) 是否有外部 ID
        if (record.modelName === 'commercial-pipeline') {
          const pipeline = (record.params as any)?.pipeline;

          // 如果有 wanRequestId，说明上次其实提交成功了，只是查询失败
          if (pipeline?.wanRequestId) {
            hasValidExternalId = true;
            this.logger.log(
              `[CostSaver] Pipeline task ${record.requestId} has external ID: ${pipeline.wanRequestId}. Resurrecting...`,
            );

            // 🔥 复活操作 1: 重置 pipeline 错误状态
            const newPipeline = { ...pipeline };
            newPipeline.error = null; // 清空错误
            // 如果之前是在 output 阶段失败，重置回 submitted 阶段，让 Cron 重新查
            if (newPipeline.stage === 'completed_with_error') {
              newPipeline.stage = 'wan_submitted';
            }
            record.params = { ...record.params, pipeline: newPipeline };
            record.markModified('params'); // 告诉 Mongoose 混合类型已修改
          }
        }
        // B. 检查 旧模型 (Pika/Wan2.1) 是否有外部 ID
        else {
          // 排除掉 err- 开头的本地生成的错误 ID
          if (record.requestId && !record.requestId.startsWith('err-')) {
            hasValidExternalId = true;
            this.logger.log(
              `[CostSaver] Legacy task ${record.requestId} has valid ID. Resurrecting...`,
            );
          }
        }

        // 🔥 决策时刻: 有 ID 就复活，没 ID 就重跑 🔥
        if (hasValidExternalId) {
          // 1. 关键：把状态改回 processing，让 Cron 任务接手
          record.status = 'processing';
          await record.save();

          // 2. 直接返回 ID 给前端
          // 前端 SSE 连上后会显示处理中，后台 Cron 会去 Wavespeed 查结果
          return { requestId: record.requestId };
        } else {
          // 没有外部 ID，说明上次连请求都没发出去（省钱失败，必须重发）
          this.logger.warn(
            `[Retry] No external ID found for failed task ${txHash}. Re-submitting to API (Chargeable).`,
          );
          // 代码允许继续向下执行 -> 重新提交
        }
      }
    }

    // ======================================================
    // 下面是：新任务提交 或 没有ID的失败重试 (需要扣费的逻辑)
    // ======================================================

    // 🔥🔥🔥 分支 A: Commercial Pipeline (新商业模型) 🔥🔥🔥
    if (model === 'commercial-pipeline') {
      // 实例化 Runner
      const { run } = useCommercialPipelineRunner();

      // 调用 Runner 的 run 方法
      // 传入 record 对象，Run 内部会更新这个 record 而不是创建新的
      return run({
        dto,
        record,
        userId,
        txHash,
        smartEnhancerService: this.smartEnhancerService,
        catModel: this.catModel,
        sseConnectionManager: this.sseConnectionManager,
      });
    }

    // 🔥🔥🔥 分支 B: 旧模型 (Pika, Wan2.1, Sam3 等) 🔥🔥🔥
    const needPromptModels = ['pika', 'wan-2.1', 'sam3', 'wan-2.6-i2v'];

    if (needPromptModels.includes(model)) {
      if (!dto.prompt || !dto.prompt.trim()) {
        throw new BadRequestException('This model requires a prompt');
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
      // 生成 err- 占位符，确保下次重试时会被识别为“无有效外部ID”，从而触发真正的重试
      requestId = `err-${txHash.slice(-6)}-${Date.now()}`;
    }

    // 存库 / 更新库
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

    // 即使失败也返回 requestId，让前端可以查询状态
    return {
      requestId,
      status: finalStatus,
      ...(finalStatus === 'failed' ? { error: errorMsg } : {}),
    };
  }

  // =======================================================
  // 2. 轮询状态 (FindOne)
  // =======================================================
  async findOne(id: string) {
    const record = await this.catModel.findOne({ requestId: id });

    if (!record) {
      throw new BadRequestException('Task does not exist');
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

      // 🔥 Push SSE completion event for legacy models
      this.sseConnectionManager.sendCompletion(record.requestId, {
        id: record.requestId,
        status: record.status,
        resultUrl: record.outputUrl,
        thumbUrl: record.thumbUrl,
        modelName: record.modelName,
        prompt: record.prompt,
      });
    } else if (apiResult.status === 'failed') {
      record.status = 'failed';
      await record.save();

      // 🔥 Push SSE error event for legacy models
      this.sseConnectionManager.sendError(record.requestId, {
        message: 'Task failed',
        requestId: record.requestId,
      });
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
