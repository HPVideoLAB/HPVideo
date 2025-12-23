// create-large-language-model.dto.ts
import {
  IsArray,
  ArrayMinSize,
  IsNotEmpty,
  IsString,
  IsUrl,
  IsOptional,
  IsIn,
} from 'class-validator';

export class CreateLargeLanguageModelDto {
  // 提示词：字符串，不能为空
  @IsString()
  @IsNotEmpty()
  prompt: string;

  // 图片：URL 数组，最少 1 个
  @IsArray()
  @ArrayMinSize(2)
  @IsUrl({}, { each: true })
  images: string[];

  // 尺寸
  @IsOptional()
  @IsIn(['720p', '1080p'])
  resolution?: '720p' | '1080p';
}
