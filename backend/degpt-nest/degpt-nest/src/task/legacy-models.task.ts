import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LargeMode,
  LargeModeDocument,
} from '@/large-language-model/schemas/creatimg-schema';
import { SSEConnectionManager } from '@/large-language-model/sse-connection.manager';
import { usePika } from '@/hook/usepika';

@Injectable()
export class LegacyModelsTask {
  private readonly logger = new Logger(LegacyModelsTask.name);

  // 🔥 优化：拆分锁，防止快/慢任务互相阻塞
  private isCheckingFast = false;
  private isCheckingSlow = false;

  constructor(
    @InjectModel(LargeMode.name)
    private readonly largeModeModel: Model<LargeModeDocument>,
    private readonly sseConnectionManager: SSEConnectionManager,
  ) {}

  // ========================================================
  // 监控快速模型 (Sam3, Wan 2.1) - 每 15 秒检查一次
  // ========================================================
  @Cron('*/5 * * * * *') // 按需调整频率
  async checkFastModelsStatus() {
    if (this.isCheckingFast) return; // 使用专用锁
    this.isCheckingFast = true;

    try {
      const pendingTasks = await this.largeModeModel
        .find({
          modelName: { $in: ['sam3', 'wan-2.1'] },
          status: 'processing',
        })
        .limit(20);

      if (pendingTasks.length === 0) {
        this.isCheckingFast = false;
        return;
      }

      this.logger.log(
        `[Fast Models Check] Checking ${pendingTasks.length} tasks...`,
      );

      await this.processLegacyTasks(pendingTasks);
    } catch (err) {
      this.logger.error(`Cron Fast Models error: ${err.message}`);
    } finally {
      this.isCheckingFast = false;
    }
  }

  // ========================================================
  // 监控慢速模型 (Pika, Wan 2.6) - 每 30 秒检查一次
  // ========================================================
  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkSlowModelsStatus() {
    if (this.isCheckingSlow) return; // 使用专用锁
    this.isCheckingSlow = true;

    try {
      const pendingTasks = await this.largeModeModel
        .find({
          modelName: { $in: ['pika', 'wan-2.6-i2v'] },
          status: 'processing',
        })
        .limit(20);

      if (pendingTasks.length === 0) {
        this.isCheckingSlow = false;
        return;
      }

      this.logger.log(
        `[Slow Models Check] Checking ${pendingTasks.length} tasks...`,
      );

      await this.processLegacyTasks(pendingTasks);
    } catch (err) {
      this.logger.error(`Cron Slow Models error: ${err.message}`);
    } finally {
      this.isCheckingSlow = false;
    }
  }

  // ========================================================
  // 通用处理逻辑
  // ========================================================
  private async processLegacyTasks(pendingTasks: any[]) {
    const { getResult } = usePika();

    await Promise.allSettled(
      pendingTasks.map(async (task) => {
        try {
          // 🔥🔥🔥 核心修复：使用 updatedAt 防止误杀重试任务 🔥🔥🔥
          // 如果是重试的任务，updatedAt 是几秒前，而 createdAt 可能是几小时前
          const lastActiveTime =
            (task as any).updatedAt || (task as any).createdAt || new Date();
          const now = new Date();
          const ageInMinutes =
            (now.getTime() - lastActiveTime.getTime()) / 1000 / 60;

          // 这里的超时设置为 120 分钟 (2小时)
          if (ageInMinutes > 120) {
            this.logger.warn(
              `[Timeout] Task ${task.requestId} stuck for ${Math.round(ageInMinutes)} mins. Marking as failed.`,
            );

            task.status = 'failed';
            await task.save();

            this.sseConnectionManager.sendError(task.requestId, {
              message: 'Task timeout: exceeded maximum processing time',
              requestId: task.requestId,
            });
            return;
          }

          const result = await getResult(task.requestId);

          // this.logger.debug(`[${task.modelName}] ${task.requestId} status: ${result.status}`);

          if (result.status === 'completed') {
            this.logger.log(
              `[Success] ${task.modelName} completed: ${task.requestId}`,
            );

            task.status = 'completed';
            task.outputUrl = result.resultUrl as any;
            await task.save();

            this.sseConnectionManager.sendCompletion(task.requestId, {
              id: task.requestId,
              status: task.status,
              resultUrl: task.outputUrl,
              thumbUrl: task.thumbUrl,
              modelName: task.modelName,
              prompt: task.prompt,
            });
          } else if (result.status === 'failed') {
            this.logger.error(
              `[Failed] ${task.modelName} failed: ${task.requestId}`,
            );

            task.status = 'failed';
            await task.save();

            this.sseConnectionManager.sendError(task.requestId, {
              message: 'Task failed',
              requestId: task.requestId,
            });
          }
          // 'processing' 状态不做操作
        } catch (innerErr) {
          this.logger.error(
            `Task ${task.requestId} check error: ${innerErr.message}`,
          );
        }
      }),
    );
  }
}
