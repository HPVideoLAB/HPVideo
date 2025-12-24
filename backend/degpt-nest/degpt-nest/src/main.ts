import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 禁用 ETag，避免 GET 轮询结果被条件缓存复用
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.disable('etag'); // 或 expressApp.set('etag', false)
  // 自动校验参数
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动剥离无关字段
      forbidNonWhitelisted: true, // 有不认识的字段直接报错
      transform: true, // 自动把json转换成对应的DTO对象
    }),
  );
  // 开启跨域
  app.enableCors({
    origin: true, // 也可以填写具体地址如 'http://154.198.49.172:6004'
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
