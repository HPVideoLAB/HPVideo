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
  private isChecking = false;

  constructor(
    @InjectModel(LargeMode.name)
    private readonly largeModeModel: Model<LargeModeDocument>,
    private readonly sseConnectionManager: SSEConnectionManager,
  ) {}

  // ========================================================
  // 监控快速模型 (Sam3, Wan 2.1) - 每 15 秒检查一次
  // ========================================================
  @Cron('*/15 * * * * *') // 每 15 秒
  async checkFastModelsStatus() {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      // 查询快速模型的 processing 任务
      const pendingTasks = await this.largeModeModel
        .find({
          modelName: { $in: ['sam3', 'wan-2.1'] },
          status: 'processing',
        })
        .limit(20);

      if (pendingTasks.length === 0) {
        this.isChecking = false;
        return;
      }

      this.logger.log(
        `[Fast Models Check] Checking ${pendingTasks.length} tasks (Sam3, Wan 2.1)...`,
      );

      await this.processLegacyTasks(pendingTasks);
    } catch (err) {
      this.logger.error(`Cron Fast Models error: ${err.message}`);
    } finally {
      this.isChecking = false;
    }
  }

  // ========================================================
  // 监控慢速模型 (Pika, Wan 2.6) - 每 30 秒检查一次
  // ========================================================
  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkSlowModelsStatus() {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      // 查询慢速模型的 processing 任务
      const pendingTasks = await this.largeModeModel
        .find({
          modelName: { $in: ['pika', 'wan-2.6-i2v'] },
          status: 'processing',
        })
        .limit(20);

      if (pendingTasks.length === 0) {
        this.isChecking = false;
        return;
      }

      this.logger.log(
        `[Slow Models Check] Checking ${pendingTasks.length} tasks (Pika, Wan 2.6)...`,
      );

      await this.processLegacyTasks(pendingTasks);
    } catch (err) {
      this.logger.error(`Cron Slow Models error: ${err.message}`);
    } finally {
      this.isChecking = false;
    }
  }

  // ========================================================
  // 通用处理逻辑（提取出来复用）
  // ========================================================
  private async processLegacyTasks(pendingTasks: any[]) {
    const { getResult } = usePika();

    // 并发查询所有任务
    await Promise.allSettled(
        pendingTasks.map(async (task) => {
          try {
            // 🔥 检查任务是否超时（创建时间超过 2 小时）
            const createdAt = (task as any).createdAt || new Date();
            const now = new Date();
            const ageInMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;

            if (ageInMinutes > 120) {
              this.logger.warn(
                `[Timeout] Task ${task.requestId} has been processing for ${Math.round(ageInMinutes)} minutes, marking as failed`,
              );

              task.status = 'failed';
              await task.save();

              // 🔥 Push SSE error event
              this.sseConnectionManager.sendError(task.requestId, {
                message: 'Task timeout: exceeded maximum processing time',
                requestId: task.requestId,
              });
              return;
            }

            const result = await getResult(task.requestId);

            // 🔥 添加详细日志
            this.logger.debug(
              `[${task.modelName}] ${task.requestId} status: ${result.status}`,
            );

            if (result.status === 'completed') {
              this.logger.log(
                `[Success] ${task.modelName} completed: ${task.requestId}`,
              );

              task.status = 'completed';
              task.outputUrl = result.resultUrl as any;
              await task.save();

              // 🔥 Push SSE completion event
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

              // 🔥 Push SSE error event
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
