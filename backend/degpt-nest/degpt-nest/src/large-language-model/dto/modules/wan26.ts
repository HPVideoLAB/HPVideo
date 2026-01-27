import {
  IsNotEmpty,
  IsUrl,
  ValidateIf,
  IsOptional,
  IsInt,
  IsIn,
  IsString,
} from 'class-validator';
import { IsOnlyForModel } from '../model-validator';

export class Wan26Dto {
  @ValidateIf((o) => o.model === 'wan-2.6-i2v')
  @IsOnlyForModel(['wan-2.6-i2v'])
  @IsUrl()
  @IsNotEmpty()
  image?: string;

  // ✅ Wan 2.6 自己的 Duration
  @ValidateIf((o) => o.model === 'wan-2.6-i2v')
  @IsOnlyForModel(['wan-2.6-i2v'])
  @IsInt()
  @IsIn([5, 10, 15])
  duration?: number; // 单模型调用时通常可选（hook有默认值），或者你也可以设为必填

  // ✅ Wan 2.6 自己的 Resolution
  @IsOptional()
  @ValidateIf((o) => o.model === 'wan-2.6-i2v')
  @IsOnlyForModel(['wan-2.6-i2v'])
  @IsIn(['720p', '1080p'])
  resolution?: '720p' | '1080p';

  @IsOptional()
  @ValidateIf((o) => o.model === 'wan-2.6-i2v')
  @IsOnlyForModel(['wan-2.6-i2v'])
  @IsString()
  negative_prompt?: string;

  @IsOptional()
  @ValidateIf((o) => o.model === 'wan-2.6-i2v')
  @IsOnlyForModel(['wan-2.6-i2v'])
  @IsString()
  @IsIn(['single', 'multi'])
  shot_type?: 'single' | 'multi';
}
