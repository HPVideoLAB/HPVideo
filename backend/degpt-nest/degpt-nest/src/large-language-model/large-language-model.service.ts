import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { CreateLargeLanguageModelDto } from './dto/create-large-language-model.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LargeMode, LargeModeDocument } from './schemas/creatimg-schema';

import { usePika } from '@/hook/usepika';
/**
组合式 pipeline 的“推进引擎。
 */
import { useCommercialPipeline } from '@/hook/useCommercialPipeline';
/**
 * useModelDispatcher.ts：单模型的“路由分发器”
作用：把 dto.model 分发到对应模型的 submit hook（pika/wan/sam3/ltx/upscaler/kling），并统一返回 {requestId, thumbUrl}。
 */
import { useModelDispatcher } from '@/hook/useModelDispatcher';
/**
组合式 pipeline 的“推进引擎。
 */
import { useCommercialPipelineRunner } from '@/hook/useCommercialPipelineRunner';
import { SmartEnhancerService } from '@/smart-enhancer/smart-enhancer.service';

@Injectable()
export class LargeLanguageModelService {
  private readonly logger = new Logger(LargeLanguageModelService.name);

  constructor(
    @InjectModel(LargeMode.name) private catModel: Model<LargeModeDocument>,
    private readonly smartEnhancerService: SmartEnhancerService,
  ) {}

  async create(createCatDto: CreateLargeLanguageModelDto, userId: string) {
    const dto: any = createCatDto;
    const { txHash, model } = dto;

    if (!txHash) throw new BadRequestException('支付凭证丢失');

    // 幂等查库
    const record = await this.catModel.findOne({ txHash });
    if (record) {
      if (record.status === 'processing' || record.status === 'completed') {
        throw new BadRequestException('该支付凭证已使用，请勿重复提交');
      }
      this.logger.log(`Retrying failed task for hash: ${txHash}`);
    }

    // ✅ pipeline：抽离
    if (model === 'commercial-pipeline') {
      const { run } = useCommercialPipelineRunner();
      return run({
        dto,
        record,
        userId,
        txHash,
        smartEnhancerService: this.smartEnhancerService,
        catModel: this.catModel,
      });
    }

    // ✅ 旧模型 prompt 强制
    const needPromptModels = ['pika', 'wan-2.1', 'sam3', 'ltx-2-19b'];
    if (needPromptModels.includes(model)) {
      if (!dto.prompt || !dto.prompt.trim()) {
        throw new BadRequestException('该模型必须提供 prompt');
      }
    }

    // ✅ 单模型 submit：抽离
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

    // 存库：新建 or failed 复活
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
        `服务提交失败 (${errorMsg})，凭证已记录，请稍后点击“重试”按钮（无需重新支付）。`,
      );
    }

    return { requestId };
  }

  // =======================================================
  // 2) 轮询：pipeline 自动推进 + 其它模型保持不变
  // =======================================================
  async findOne(id: string) {
    const record = await this.catModel.findOne({ requestId: id });

    if (!record) {
      throw new BadRequestException('任务不存在');
    }

    // ✅ pipeline：推进流水线
    if (record.modelName === 'commercial-pipeline') {
      const pipeline = (record.params as any)?.pipeline;
      if (!pipeline) throw new BadRequestException('pipeline state missing');

      // 已终结直接返回
      if (record.status === 'completed' || record.status === 'failed') {
        return {
          id: record.requestId,
          status: record.status,
          resultUrl: record.outputUrl,
          audioUrl: pipeline.audioUrl,
          stage: pipeline.stage,
          raw: { pipeline },
        };
      }

      const { advanceOnce } = useCommercialPipeline();
      const { state, apiResult } = await advanceOnce(pipeline);

      // 写回 pipeline 状态
      (record.params as any).pipeline = state;

      // ✅ 关键：params 多半是 Mixed/any，深层变更必须 markModified 否则可能不落库
      record.markModified('params'); // 或者：record.markModified('params.pipeline');

      // 同步顶层状态 & outputUrl
      if (state.stage === 'completed') {
        record.status = 'completed';
        record.outputUrl = state.finalVideoUrl || state.dubbedVideoUrl || '';
      } else if (state.stage === 'failed') {
        record.status = 'failed';
        // 失败也建议清一下 outputUrl，避免前端误用旧链接（可选）
        // record.outputUrl = '';
      } else {
        record.status = 'processing';
      }

      // （可选）调试：看看 stage 是否在推进
      this.logger.log(
        `[pipeline] id=${record.requestId} stage=${pipeline.stage} -> ${state.stage}`,
      );

      await record.save();

      return {
        id: record.requestId,
        status: record.status,
        stage: state.stage,
        resultUrl:
          record.outputUrl || state.finalVideoUrl || state.dubbedVideoUrl,
        audioUrl: state.audioUrl,
        raw: apiResult?.raw ?? { pipeline: state },
      };
    }

    // ✅ 非 pipeline：已终结直接返回
    if (record.status === 'completed' || record.status === 'failed') {
      return {
        id: record.requestId,
        status: record.status,
        resultUrl: record.outputUrl,
        raw: { status: record.status },
      };
    }

    // ✅ 统一轮询 predictions（你原来的逻辑）
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
  // 3) 获取历史
  // =======================================================
  async findAllByUser(userId: string) {
    if (!userId || userId === 'anonymous') return [];
    return this.catModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }
}
