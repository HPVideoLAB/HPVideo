import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LargeMode,
  LargeModeDocument,
} from '@/large-language-model/schemas/creatimg-schema';
import { useVideoUpscalerPro } from '@/hook/useVideoUpscalerPro';
import { useCommercialPipeline } from '@/hook/useCommercialPipeline';

@Injectable()
export class CommercialPipelineTask {
  private readonly logger = new Logger(CommercialPipelineTask.name);

  private isCheckingWan = false;
  private isCheckingUpscale = false;

  constructor(
    @InjectModel(LargeMode.name)
    private readonly largeModeModel: Model<LargeModeDocument>,
  ) {}

  // ========================================================
  // 1. 监工 A: 盯着 Wan 2.6
  // 优化点：频率改为每 30 秒 (或者 EVERY_MINUTE)
  // ========================================================
  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkWanGenerationStatus() {
    if (this.isCheckingWan) return;
    this.isCheckingWan = true;

    try {
      // 优化点：一次查 20 个，避免积压
      const pendingTasks = await this.largeModeModel
        .find({
          modelName: 'commercial-pipeline',
          'params.pipeline.stage': 'wan_submitted',
          status: 'processing',
        })
        .limit(20);

      if (pendingTasks.length === 0) {
        this.isCheckingWan = false;
        return;
      }

      const { getWanResult } = useCommercialPipeline();
      const { submitUpscalerTask } = useVideoUpscalerPro();

      this.logger.log(
        `[Wan Check] 批量扫描 ${pendingTasks.length} 个任务状态...`,
      );

      // 优化点：使用 Promise.allSettled 并发查询，互不阻塞
      await Promise.allSettled(
        pendingTasks.map(async (task) => {
          try {
            const pipelineState = task.params.pipeline;
            const wanId = pipelineState.wanRequestId;

            const wanResult = await getWanResult(wanId);

            if (wanResult.status === 'SUCCEEDED') {
              const rawVideoUrl = wanResult.outputUrl;
              if (!rawVideoUrl) {
                task.status = 'failed';
                task.params.pipeline.error = 'No output URL';
                await task.save();
                return;
              }

              this.logger.log(`[Success] Wan 2.6 完成: ${task.requestId}`);

              const upscale = pipelineState.enableUpscale;

              if (upscale && upscale !== 'default') {
                // 进入 Upscale 流程
                const upscaleId = await submitUpscalerTask({
                  video: rawVideoUrl,
                  target_resolution: upscale,
                });
                task.params.pipeline.stage = 'upscaling';
                task.params.pipeline.wanOutputUrl = rawVideoUrl;
                task.params.pipeline.upscaleRequestId = upscaleId;
              } else {
                // 任务直接完成
                task.params.pipeline.stage = 'completed';
                task.outputUrl = rawVideoUrl;
                task.status = 'completed';
              }
              task.markModified('params');
              await task.save();
            } else if (wanResult.status === 'FAILED') {
              this.logger.error(`[Failed] Wan 2.6 失败: ${task.requestId}`);
              task.status = 'failed';
              task.params.pipeline.error = wanResult.errorMessage;
              await task.save();
            }
            // RUNNING 状态不做操作，直接结束本次检查
          } catch (innerErr) {
            this.logger.error(
              `Task ${task.requestId} check error: ${innerErr.message}`,
            );
          }
        }),
      );
    } catch (err) {
      this.logger.error(`Cron Wan 监工异常: ${err.message}`);
    } finally {
      this.isCheckingWan = false;
    }
  }

  // ========================================================
  // 2. 监工 B: 盯着 Upscale
  // 优化点：Upscale 比较快(几十秒)，可以用 10秒 或 30秒
  // ========================================================
  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkUpscaleStatus() {
    if (this.isCheckingUpscale) return;
    this.isCheckingUpscale = true;

    try {
      const scalingTasks = await this.largeModeModel
        .find({
          modelName: 'commercial-pipeline',
          'params.pipeline.stage': 'upscaling',
          status: 'processing',
        })
        .limit(20);

      if (scalingTasks.length === 0) {
        this.isCheckingUpscale = false;
        return;
      }

      const { getResult } = useVideoUpscalerPro();

      // 同样使用并发查询
      await Promise.allSettled(
        scalingTasks.map(async (task) => {
          try {
            const upscaleId = task.params.pipeline.upscaleRequestId;
            const result = await getResult(upscaleId);

            if (result.status === 'completed') {
              const finalUrl = result.resultUrl;
              if (finalUrl) {
                task.outputUrl = finalUrl;
                task.status = 'completed';
              } else {
                task.outputUrl = task.params.pipeline.wanOutputUrl; // 兜底
                task.status = 'completed';
              }
              task.params.pipeline.stage = 'completed';
              task.markModified('params');
              await task.save();
            } else if (result.status === 'failed') {
              // 降级策略
              task.outputUrl = task.params.pipeline.wanOutputUrl;
              task.status = 'completed';
              task.params.pipeline.stage = 'completed_with_error';
              task.markModified('params');
              await task.save();
            }
          } catch (innerErr) {
            this.logger.error(
              `Upscale check error ${task.requestId}: ${innerErr.message}`,
            );
          }
        }),
      );
    } catch (err) {
      this.logger.error(`Cron Upscale 监工异常: ${err.message}`);
    } finally {
      this.isCheckingUpscale = false;
    }
  }
}
