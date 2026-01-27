import { BadRequestException, Logger } from '@nestjs/common';
import {
  useCommercialPipeline,
  PipelineState,
} from '@/hook/useCommercialPipeline';
import { SmartEnhancerService } from '@/smart-enhancer/smart-enhancer.service';

export const useCommercialPipelineRunner = () => {
  const logger = new Logger('useCommercialPipelineRunner');

  const run = async (args: {
    dto: any;
    record: any;
    userId: string;
    txHash: string;
    smartEnhancerService: SmartEnhancerService;
    catModel: any;
  }) => {
    const { dto, record, userId, txHash, smartEnhancerService, catModel } =
      args;

    const originalPrompt = dto.prompt ?? '';
    const productImage = dto.image;

    // 校验必填项
    if (!dto.duration) throw new BadRequestException('缺少 duration');
    if (!productImage) throw new BadRequestException('缺少 image（产品图）');

    // ✅ 统一 pipelineId：保证失败也能生成可追踪记录
    const pipelineId =
      record?.requestId ||
      `pipe-${txHash?.slice?.(-6) ?? 'anon'}-${Date.now()}`;

    // ✅ 先准备一个“兜底 pipelineState”，失败时也能写进去
    const pipelineStateBase: PipelineState = {
      stage: 'wan_submitted', // 默认先写这个，失败时会改
      videoPrompt: '',
      startFrame: null,
      wanRequestId: '',
      enableUpscale: dto.enableUpscale ?? 'default', // 你现在是 'default'|'2k'|'4k'
    };

    try {
      // 1) Smart Enhancer
      const enableOpt = dto.enableSmartEnhance !== false;

      const r = await smartEnhancerService.runTest(
        originalPrompt,
        productImage,
        enableOpt,
        dto.voice_id,
      );

      const finalPrompt = r.finalOutput.videoPrompt;
      const startFrame = r.finalOutput.startFrame;

      // 2) 提交给 Wan 2.6
      const { submitWan } = useCommercialPipeline();
      const wanId = await submitWan({
        image: startFrame as any,
        prompt: finalPrompt,
        seed: dto.seed,
        duration: dto.duration,
        resolution: dto.resolution,
        negative_prompt: dto.negative_prompt,
        shot_type: dto.shot_type,
      });

      const pipelineState: PipelineState = {
        ...pipelineStateBase,
        stage: 'wan_submitted',
        videoPrompt: finalPrompt,
        startFrame,
        wanRequestId: wanId,
        enableUpscale: dto.enableUpscale ?? 'default',
      };

      // 3) 存库（成功：processing）
      if (record) {
        record.requestId = pipelineId;
        record.userId = userId;
        record.modelName = 'commercial-pipeline';
        record.prompt = originalPrompt;
        record.params = { ...dto, pipeline: pipelineState };
        record.status = 'processing';
        record.thumbUrl = startFrame;
        record.outputUrl = '';
        await record.save();
      } else {
        const newRecord = new catModel({
          requestId: pipelineId,
          userId,
          txHash,
          modelName: 'commercial-pipeline',
          prompt: originalPrompt,
          params: { ...dto, pipeline: pipelineState },
          status: 'processing',
          thumbUrl: startFrame,
          outputUrl: '',
        });
        await newRecord.save();
      }

      return { requestId: pipelineId };
    } catch (e: any) {
      // ✅ 失败也入库：让前端可见、可重试
      const errMsg = e?.message || 'Unknown error';
      logger.error(`[Commercial Pipeline] 启动失败: ${errMsg}`);

      const failedPipelineState: PipelineState = {
        ...pipelineStateBase,
        stage: 'completed_with_error', // 或者你想用专门的 failed stage 也行
        error: errMsg,
      };

      if (record) {
        record.requestId = pipelineId;
        record.userId = userId;
        record.modelName = 'commercial-pipeline';
        record.prompt = originalPrompt;
        record.params = { ...dto, pipeline: failedPipelineState };
        record.status = 'failed'; // ✅ 关键：让前端展示失败 + 重试
        record.outputUrl = '';
        // thumbUrl：尽量保留；如果 enhancer 失败拿不到 startFrame，就留旧值或空
        if (!record.thumbUrl) record.thumbUrl = '';
        await record.save();
      } else {
        const newRecord = new catModel({
          requestId: pipelineId,
          userId,
          txHash,
          modelName: 'commercial-pipeline',
          prompt: originalPrompt,
          params: { ...dto, pipeline: failedPipelineState },
          status: 'failed', // ✅ 关键
          thumbUrl: '', // enhancer 都失败就没有 startFrame
          outputUrl: '',
        });
        await newRecord.save();
      }

      // ✅ 跟旧模型保持一致：抛错给前端，但已经入库了
      throw new BadRequestException(
        `服务提交失败 (${errMsg})，凭证已记录，请稍后点击“重试”按钮。`,
      );
    }
  };

  return { run };
};
