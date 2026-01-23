import { IntersectionType } from '@nestjs/mapped-types';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { PikaDto } from './modules/pika';
import { WanDto } from './modules/wan';
import { Sam3Dto } from './modules/sam3';
import { LtxDto } from './modules/ltx';

// ✅ 新增
import { UpscalerDto } from './modules/upscaler';
import { KlingAudioDto } from './modules/kling-audio';
import { CommercialPipelineDto } from './modules/commercial-pipeline';

class BaseDto {
  @IsString()
  @IsNotEmpty()
  @IsIn([
    'pika',
    'wan-2.1',
    'sam3',
    'ltx-2-19b',
    'video-upscaler-pro',
    'kling-video-to-audio',
    'commercial-pipeline', // ✅ 新增
  ])
  model:
    | 'pika'
    | 'wan-2.1'
    | 'sam3'
    | 'ltx-2-19b'
    | 'video-upscaler-pro'
    | 'kling-video-to-audio'
    | 'commercial-pipeline';

  // ✅ 改成可选：旧模型是否必填由 service 控制
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
          LtxDto,
          IntersectionType(
            UpscalerDto,
            IntersectionType(KlingAudioDto, CommercialPipelineDto), // ✅ 加在最后
          ),
        ),
      ),
    ),
  ),
) {}
