import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  IsNumber,
  IsInt,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsOnlyForModel } from '../model-validator';

// Wan 专属子对象
export class LoraDto {
  @IsString()
  path: string;

  @IsNumber()
  scale: number;
}

export class WanDto {
  // Video 在 Wan 中是必填
  @ValidateIf((o) => o.model === 'wan-2.1')
  @IsOnlyForModel(['wan-2.1'])
  @IsString()
  @IsNotEmpty()
  video?: string;

  // Wan 的 Duration 限制 (5-10)
  @IsOptional()
  @ValidateIf((o) => o.model === 'wan-2.1')
  @IsOnlyForModel(['wan-2.1'])
  @IsInt()
  @Min(5)
  @Max(10)
  duration?: number;

  @IsOptional()
  @IsOnlyForModel(['wan-2.1'])
  @IsString()
  negative_prompt?: string;

  @IsOptional()
  @IsOnlyForModel(['wan-2.1'])
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => LoraDto)
  loras?: LoraDto[];

  @IsOptional()
  @IsOnlyForModel(['wan-2.1'])
  @IsNumber()
  strength?: number;

  @IsOptional()
  @IsOnlyForModel(['wan-2.1'])
  @IsInt()
  @Min(1)
  @Max(40)
  num_inference_steps?: number;

  @IsOptional()
  @IsOnlyForModel(['wan-2.1'])
  @IsNumber()
  @Min(0)
  @Max(20)
  guidance_scale?: number;

  @IsOptional()
  @IsOnlyForModel(['wan-2.1'])
  @IsNumber()
  @Min(1)
  @Max(10)
  flow_shift?: number;
}
