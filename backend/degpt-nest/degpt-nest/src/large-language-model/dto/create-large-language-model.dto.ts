import { IntersectionType } from '@nestjs/mapped-types'; // 或者 @nestjs/mapped-types
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// 导入刚才拆分的 4 个文件
import { PikaDto } from './modules/pika';
import { WanDto } from './modules/wan';
import { Sam3Dto } from './modules/sam3';
import { LtxDto } from './modules/ltx';

// 基础 DTO (所有模型通用)
class BaseDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['pika', 'wan-2.1', 'sam3', 'ltx-2-19b']) // ✅ 已加入 ltx
  model: 'pika' | 'wan-2.1' | 'sam3' | 'ltx-2-19b';

  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsOptional()
  @IsInt()
  @Min(-1)
  seed?: number;

  @IsOptional()
  @IsString()
  txHash?: string;
}

// 🔥 终极合并：Base + Pika + Wan + Sam3 + Ltx
export class CreateLargeLanguageModelDto extends IntersectionType(
  BaseDto,
  IntersectionType(
    PikaDto,
    IntersectionType(WanDto, IntersectionType(Sam3Dto, LtxDto)),
  ),
) {}
