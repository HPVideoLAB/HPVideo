import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LargeLanguageModelModule } from './large-language-model/large-language-model.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { OssModule } from './oss/oss.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 全局可用，不用每个模块重复导入
      cache: true, // 可选：缓存读取结果
      // 核心修改：不要硬编码 envFilePath
      // 1. 如果是本地开发，它会自动读取根目录的 .env
      // 2. 如果是生产环境(Docker)，它会忽略文件（因为没文件），直接读取系统注入的变量
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    LargeLanguageModelModule,
    // 改这里：优先读环境变量，兼容 docker 场景
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/degpt',
    ),
    OssModule, // 连接字符串
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
