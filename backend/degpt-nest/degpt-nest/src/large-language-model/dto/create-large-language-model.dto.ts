import { IntersectionType } from '@nestjs/mapped-types';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// 模块
import { PikaDto } from './modules/pika';
import { WanDto } from './modules/wan'; // 这是旧的 wan2.1
import { Sam3Dto } from './modules/sam3';
import { UpscalerDto } from './modules/upscaler';
// ✅ 新增/修改
import { Wan26Dto } from './modules/wan26';
import { CommercialPipelineDto } from './modules/commercial-pipeline';

class BaseDto {
  @IsString()
  @IsNotEmpty()
  @IsIn([
    'pika',
    'wan-2.1',
    'sam3',
    'video-upscaler-pro',
    'wan-2.6-i2v', // ✅ 新增
    'commercial-pipeline',
  ])
  model:
    | 'pika'
    | 'wan-2.1'
    | 'sam3'
    | 'video-upscaler-pro'
    | 'wan-2.6-i2v'
    | 'commercial-pipeline';

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsInt()
  @Min(-1)
  seed?: number;

  @IsOptional()
  @IsString()
  txHash?: string;
}

export class CreateLargeLanguageModelDto extends IntersectionType(
  BaseDto,
  IntersectionType(
    PikaDto,
    IntersectionType(
      WanDto,
      IntersectionType(
        Sam3Dto,
        IntersectionType(
          UpscalerDto,
          IntersectionType(Wan26Dto, CommercialPipelineDto),
        ),
      ),
    ),
  ),
) {}
