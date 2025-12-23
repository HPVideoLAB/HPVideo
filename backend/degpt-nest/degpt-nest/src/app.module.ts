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
      // envFilePath: '.env', // 可选：默认就是根目录 .env
    }),
    LargeLanguageModelModule,
    MongooseModule.forRoot('mongodb://localhost:27017/degpt'),
    OssModule, // 连接字符串
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
