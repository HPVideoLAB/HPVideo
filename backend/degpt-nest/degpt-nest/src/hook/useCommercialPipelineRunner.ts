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
    sseConnectionManager?: any; // 🔥 新增：SSE 连接管理器
  }) => {
    const {
      dto,
      record,
      userId,
      txHash,
      smartEnhancerService,
      catModel,
      sseConnectionManager,
    } = args;

    const originalPrompt = dto.prompt ?? '';
    const productImage = dto.image;

    // 校验
    if (!dto.duration) throw new BadRequestException('Missing duration');
    if (!productImage)
      throw new BadRequestException('Missing image (product image)');

    // =================================================================
    // 🔥🔥🔥 修改核心：解析画质参数 🔥🔥🔥
    // =================================================================
    // 1. 获取前端传来的单一参数，默认为 '1080p' (即 default)
    const qualityTier = dto.enableUpscale || '1080p';

    // 2. 定义两个关键变量：
    //    baseResolution: 发给 Wan 2.6 生成视频用的 (只能是 720p 或 1080p)
    //    upscaleTarget:  发给 PipelineState 用的 (告诉 Cron Task 后续要不要超分)
    let baseResolution: '720p' | '1080p' = '1080p';
    let upscaleTarget: 'default' | '2k' | '4k' = 'default';

    switch (qualityTier) {
      case '720p':
        baseResolution = '720p';
        upscaleTarget = 'default'; // 不需要超分
        break;
      case '1080p':
      case 'default':
        baseResolution = '1080p';
        upscaleTarget = 'default'; // 不需要超分
        break;
      case '2k':
        baseResolution = '1080p'; // 2K 基于 1080p 底片
        upscaleTarget = '2k'; // 需要超分到 2K
        break;
      case '4k':
        baseResolution = '1080p'; // 4K 基于 1080p 底片
        upscaleTarget = '4k'; // 需要超分到 4K
        break;
      default:
        baseResolution = '1080p';
        upscaleTarget = 'default';
    }

    const pipelineId =
      record?.requestId ||
      `pipe-${txHash?.slice?.(-6) ?? 'anon'}-${Date.now()}`;

    // ✅ 使用解析后的 upscaleTarget 初始化状态
    const pipelineStateBase: PipelineState = {
      stage: 'wan_submitted',
      videoPrompt: '',
      startFrame: null,
      wanRequestId: '', // 初始为空，等待下方异步填充
      enableUpscale: upscaleTarget, // 🔥 这里存真正的超分指令
    };

    // 🔥🔥🔥 关键修改：先创建数据库记录并返回 requestId，然后异步处理 🔥🔥🔥
    try {
      // 1. 先创建/重置数据库记录（状态为 processing）
      if (record) {
        record.requestId = pipelineId;
        record.userId = userId;
        record.modelName = 'commercial-pipeline';
        record.prompt = originalPrompt;
        // 🔥 彻底覆盖旧的 params，特别是清空之前的 wanRequestId，确保这次是全新的运行
        record.params = { ...dto, pipeline: pipelineStateBase };
        record.status = 'processing';
        record.thumbUrl = productImage; // 先用原图作为缩略图
        record.outputUrl = '';
        // 🔥 重要：更新 createdAt，避免 Cron Task 误判为超时任务
        (record as any).createdAt = new Date();

        // 标记 params 已修改 (Mongoose 混合类型必须)
        record.markModified('params');
        await record.save();
      } else {
        const newRecord = new catModel({
          requestId: pipelineId,
          userId,
          txHash,
          modelName: 'commercial-pipeline',
          prompt: originalPrompt,
          params: { ...dto, pipeline: pipelineStateBase },
          status: 'processing',
          thumbUrl: productImage, // 先用原图作为缩略图
          outputUrl: '',
        });
        await newRecord.save();
      }

      // 2. 立即返回 requestId 给前端
      logger.log(
        `[Commercial Pipeline] 任务已创建: ${pipelineId}，开始后台处理`,
      );

      // 3. 在后台异步处理（不阻塞响应）
      setImmediate(async () => {
        try {
          // 🔥 发送 SSE 状态更新：开始处理
          if (sseConnectionManager) {
            sseConnectionManager.sendStatusUpdate(pipelineId, {
              status: 'processing',
              stage: 'enhancing',
              message: 'Optimizing prompt and generating start frame...',
              requestId: pipelineId,
            });
          }

          // Smart Enhancer
          const enableOpt = dto.enableSmartEnhance !== false;

          const r = await smartEnhancerService.runTest(
            originalPrompt,
            productImage,
            enableOpt,
            dto.voice_id,
            dto.duration,
          );

          const finalPrompt = r.finalOutput.videoPrompt;
          const startFrame = r.finalOutput.startFrame;

          // 🔥 发送 SSE 状态更新：开始提交视频生成
          if (sseConnectionManager) {
            sseConnectionManager.sendStatusUpdate(pipelineId, {
              status: 'processing',
              stage: 'submitting',
              message: 'Submitting video generation task...',
              requestId: pipelineId,
            });
          }

          // 提交给 Wan 2.6
          const { submitWan } = useCommercialPipeline();
          const wanId = await submitWan({
            image: startFrame as any,
            prompt: finalPrompt,
            seed: dto.seed,
            duration: dto.duration,
            resolution: baseResolution,
            negative_prompt: dto.negative_prompt,
            shot_type: dto.shot_type,
          });

          const pipelineState: PipelineState = {
            ...pipelineStateBase,
            stage: 'wan_submitted',
            videoPrompt: finalPrompt,
            startFrame,
            wanRequestId: wanId, // ✅ 这里拿到了关键的第三方 ID
            enableUpscale: upscaleTarget,
          };

          // 更新数据库
          // 注意：需重新 findOne，因为 record 对象在异步过程中可能不是最新的
          const taskRecord = await catModel.findOne({ requestId: pipelineId });
          if (taskRecord) {
            taskRecord.params = { ...dto, pipeline: pipelineState };
            taskRecord.thumbUrl = startFrame;

            // 🔥 再次标记并保存，确保存入 wanId
            taskRecord.markModified('params');
            await taskRecord.save();

            logger.log(
              `[Commercial Pipeline] 任务 ${pipelineId} 已提交到 Wan 2.6: ${wanId}`,
            );

            // 🔥 发送 SSE 状态更新：视频生成中
            if (sseConnectionManager) {
              sseConnectionManager.sendStatusUpdate(pipelineId, {
                status: 'processing',
                stage: 'generating',
                message: 'Video generation in progress...',
                requestId: pipelineId,
              });
            }
          }
        } catch (e: any) {
          const errMsg = e?.message || 'Unknown error';
          logger.error(`[Commercial Pipeline] 后台处理失败: ${errMsg}`);

          const failedPipelineState: PipelineState = {
            ...pipelineStateBase,
            stage: 'completed_with_error',
            error: errMsg,
          };

          // 更新为失败状态
          const taskRecord = await catModel.findOne({ requestId: pipelineId });
          if (taskRecord) {
            taskRecord.params = { ...dto, pipeline: failedPipelineState };
            taskRecord.status = 'failed';
            taskRecord.markModified('params'); // 确保错误信息被保存
            await taskRecord.save();
            logger.error(`[Commercial Pipeline] 任务 ${pipelineId} 标记为失败`);

            // 🔥 通过 SSE 推送失败事件并关闭连接
            if (sseConnectionManager) {
              // ✅ 修正：改用 sendError，它会发送 failed 事件并调用 closeConnections()
              sseConnectionManager.sendError(pipelineId, {
                id: pipelineId,
                status: 'failed',
                error: errMsg,
                modelName: 'commercial-pipeline',
                prompt: originalPrompt,
              });
            }
          }
        }
      });

      // 立即返回 requestId
      return { requestId: pipelineId };
    } catch (e: any) {
      // 只有数据库操作失败才会到这里
      const errMsg = e?.message || 'Unknown error';
      logger.error(`[Commercial Pipeline] 创建任务失败: ${errMsg}`);

      throw new BadRequestException(
        `Task creation failed (${errMsg}), please try again later.`,
      );
    }
  };

  return { run };
};
