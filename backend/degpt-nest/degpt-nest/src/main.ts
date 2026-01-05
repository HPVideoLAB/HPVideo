import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
// 🔥 1. 必须引入这两个
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🔥 2. 核心修复：扩大请求体限制 (必须在其他配置之前)
  // 如果不加这个，视频上传一定会报 413 或 500 错误
  app.use(json({ limit: '500mb' }));
  app.use(urlencoded({ extended: true, limit: '500mb' }));

  // 禁用 ETag
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.disable('etag');

  // 自动校验参数
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 开启跨域
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  // 生产环境开启
  // app.enableCors({
  //   origin: ['https://hpvideo.io', 'https://www.hpvideo.io'],
  //   credentials: true,
  // });
  app.setGlobalPrefix('nest');

  await app.listen(3008, '0.0.0.0');
}
bootstrap();
