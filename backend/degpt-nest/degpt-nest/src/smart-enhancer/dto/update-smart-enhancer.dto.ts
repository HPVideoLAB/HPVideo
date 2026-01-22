import { PartialType } from '@nestjs/mapped-types';
import { CreateSmartEnhancerDto } from './create-smart-enhancer.dto';

export class UpdateSmartEnhancerDto extends PartialType(CreateSmartEnhancerDto) {}
