import { Module } from '@nestjs/common';
import { SmartEnhancerService } from './smart-enhancer.service';
import { SmartEnhancerController } from './smart-enhancer.controller';

@Module({
  controllers: [SmartEnhancerController],
  providers: [SmartEnhancerService],
})
export class SmartEnhancerModule {}
