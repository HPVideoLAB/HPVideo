import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LargeModeDocument = LargeMode & Document;

@Schema({ timestamps: true })
export class LargeMode extends Document {
  // 1. 任务 ID
  @Prop({ required: true, unique: true })
  requestId: string;

  // 2. 用户标识
  @Prop({ required: true, index: true })
  userId: string;

  // 3. 模型类型
  // 🚨 修复 TS 报错：不能叫 'model'，改叫 'modelName'
  @Prop({ required: true })
  modelName: string;

  // 4. 提示词
  @Prop()
  prompt: string;

  // 5. 完整参数备份 (JSON)
  @Prop({ type: Object })
  params: any;

  // 6. 状态
  @Prop({ default: 'processing', index: true })
  status: 'processing' | 'completed' | 'failed';

  // 7. 结果 URL
  @Prop()
  outputUrl: string;

  // 8. 缩略图/封面
  @Prop()
  thumbUrl: string;
}

export const LargeModeSchema = SchemaFactory.createForClass(LargeMode);
