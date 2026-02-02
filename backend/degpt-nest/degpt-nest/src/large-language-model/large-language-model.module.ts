import { Module } from '@nestjs/common';
import { LargeLanguageModelService } from './large-language-model.service';
import { LargeLanguageModelController } from './large-language-model.controller';
import { LargeMode, LargeModeSchema } from './schemas/creatimg-schema';
import { MongooseModule } from '@nestjs/mongoose';
import { SmartEnhancerModule } from '../smart-enhancer/smart-enhancer.module';
// ✅ 引入 Task
import { CommercialPipelineTask } from '@/task/commercial-pipeline.task';
import { LegacyModelsTask } from '@/task/legacy-models.task';
// ✅ 引入 SSE Connection Manager
import { SSEConnectionManager } from './sse-connection.manager';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LargeMode.name, schema: LargeModeSchema },
    ]),
    SmartEnhancerModule, // ✅ 关键：引入模块
  ],
  controllers: [LargeLanguageModelController],
  providers: [
    LargeLanguageModelService,
    CommercialPipelineTask, // ✅ 注册 Commercial Pipeline Task
    LegacyModelsTask, // ✅ 注册 Legacy Models Task
    SSEConnectionManager, // ✅ 注册 SSE Manager
  ],
  exports: [SSEConnectionManager], // ✅ 导出以便其他模块使用
})
export class LargeLanguageModelModule {}
