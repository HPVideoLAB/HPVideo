import { Module } from '@nestjs/common';
import { LargeLanguageModelService } from './large-language-model.service';
import { LargeLanguageModelController } from './large-language-model.controller';
import { LargeMode, LargeModeSchema } from './schemas/creatimg-schema';
import { MongooseModule } from '@nestjs/mongoose';
import { SmartEnhancerModule } from '../smart-enhancer/smart-enhancer.module';
// ✅ 引入 Task
import { CommercialPipelineTask } from '@/task/commercial-pipeline.task';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LargeMode.name, schema: LargeModeSchema },
    ]),
    SmartEnhancerModule, // ✅ 关键：引入模块
  ],
  controllers: [LargeLanguageModelController],
  providers: [
    LargeLanguageModelService, // ✅ 注册 Task!
    CommercialPipelineTask,
  ],
})
export class LargeLanguageModelModule {}
