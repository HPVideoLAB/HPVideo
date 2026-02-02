// src\large-language-model\dto\modules\wan26.ts
import {
  IsNotEmpty,
  IsUrl,
  ValidateIf,
  IsOptional,
  IsInt,
  IsIn,
  IsString,
} from 'class-validator';
// ❌ 这一行可以删掉了，因为下面没有字段再用到它了
// import { IsOnlyForModel } from '../model-validator';

export class Wan26Dto {
  // 🔥 [修改] image: Commercial 也有 -> 必须删掉 IsOnlyForModel
  @ValidateIf((o) => o.model === 'wan-2.6-i2v')
  // ❌ 删除: @IsOnlyForModel(['wan-2.6-i2v'])
  @IsUrl()
  @IsNotEmpty()
  image?: string;

  // 🔥 [修改] duration: Commercial / Wan 2.1 都有 -> 必须删掉 IsOnlyForModel
  @ValidateIf((o) => o.model === 'wan-2.6-i2v')
  // ❌ 删除: @IsOnlyForModel(['wan-2.6-i2v'])
  @IsInt()
  @IsIn([5, 10, 15])
  duration?: number;

  // 🔥 [修改] resolution: Commercial / Pika 都有 -> 必须删掉 IsOnlyForModel
  @IsOptional()
  @ValidateIf((o) => o.model === 'wan-2.6-i2v')
  // ❌ 删除: @IsOnlyForModel(['wan-2.6-i2v'])
  @IsIn(['720p', '1080p'])
  resolution?: '720p' | '1080p';

  // 🔥 [修改] negative_prompt: Commercial / Wan 2.1 都有 -> 必须删掉 IsOnlyForModel
  @IsOptional()
  @ValidateIf((o) => o.model === 'wan-2.6-i2v')
  // ❌ 删除: @IsOnlyForModel(['wan-2.6-i2v'])
  @IsString()
  negative_prompt?: string;

  // 🔥 [修改] shot_type: Commercial 也有 -> 必须删掉 IsOnlyForModel
  @IsOptional()
  @ValidateIf((o) => o.model === 'wan-2.6-i2v')
  // ❌ 删除: @IsOnlyForModel(['wan-2.6-i2v'])
  @IsString()
  @IsIn(['single', 'multi'])
  shot_type?: 'single' | 'multi';
}
