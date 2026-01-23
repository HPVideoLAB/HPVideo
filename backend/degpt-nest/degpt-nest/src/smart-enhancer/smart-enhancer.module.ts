import { Module } from '@nestjs/common';
import { SmartEnhancerService } from './smart-enhancer.service';
import { SmartEnhancerController } from './smart-enhancer.controller';

@Module({
  controllers: [SmartEnhancerController],
  providers: [SmartEnhancerService],
  exports: [SmartEnhancerService], // ✅ 关键：导出
})
export class SmartEnhancerModule {}
