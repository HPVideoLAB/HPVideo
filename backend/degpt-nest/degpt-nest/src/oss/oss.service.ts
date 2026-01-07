import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import OSS = require('ali-oss');
import { randomUUID } from 'crypto';
import * as path from 'path';
import { CreateOssDto } from './dto/create-oss.dto';
import { UpdateOssDto } from './dto/update-oss.dto';

@Injectable()
export class OssService {
  private client: OSS;

  private readonly logger = new Logger(OssService.name);

  constructor() {
    this.client = new OSS({
      accessKeyId: process.env.FILE_ACCESS_KEY_ID,
      accessKeySecret: process.env.FILE_ACCESS_KEY_SECRET,
      endpoint: process.env.FILE_ENDPOINT,
      bucket: process.env.FILE_BUCKET_NAME,
      secure: true,
      // 可选：有些网络环境加超时更清晰
      timeout: 500000,
    });

    // 启动时打印关键配置（不打印 secret）
    this.logger.log(
      `OSS init: endpoint=${process.env.FILE_ENDPOINT}, bucket=${process.env.FILE_BUCKET_NAME}, baseUrl=${process.env.FILE_OSS_URL}`,
    );
  }

  // oss.service.ts

  // ==========================================
  // [修改后] 增加 User-Agent 头，防止被 CDN 拦截
  // ==========================================
  async proxyFile(fileUrl: string, res: any) {
    try {
      // 🔥 核心修改：添加 Headers
      const response = await fetch(fileUrl, {
        headers: {
          // 伪装成浏览器，防止 CloudFront/S3 等 CDN 拦截空 User-Agent 的请求
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          // 可选：接受任意类型
          Accept: '*/*',
        },
      });

      if (!response.ok) {
        throw new Error(
          `Fetch failed with status: ${response.status} ${response.statusText}`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      res.set({
        'Content-Type':
          response.headers.get('content-type') || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Content-Length': buffer.length.toString(),
      });

      res.send(buffer);
    } catch (e) {
      // 建议打印完整错误，方便排查
      this.logger.error(`Proxy failed for url=${fileUrl}: ${e.message}`);
      if (!res.headersSent) {
        res
          .status(400)
          .send({ message: 'Failed to proxy file', error: e.message });
      }
    }
  }

  async uploadFiles(files: any[], dir = 'uploads') {
    try {
      const urls = await Promise.all(files.map((f) => this.uploadOne(f, dir)));
      return { count: urls.length, urls };
    } catch (e: any) {
      // 打印阿里云返回的关键信息
      this.logger.error(
        `OSS upload error: name=${e?.name}, code=${e?.code}, status=${e?.status}, message=${e?.message}`,
      );
      if (e?.requestId) this.logger.error(`requestId=${e.requestId}`);
      if (e?.host) this.logger.error(`host=${e.host}`);
      if (e?.url) this.logger.error(`url=${e.url}`);
      if (e?.stack) this.logger.error(e.stack);

      throw new InternalServerErrorException(
        `OSS upload failed: ${e?.code || e?.message || 'unknown'}`,
      );
    }
  }

  private async uploadOne(file: any, dir: string): Promise<string> {
    const ext = path.extname(file.originalname) || '';
    const datePath = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
    const objectKey = `${dir}/${datePath}/${randomUUID()}${ext}`;

    await this.client.put(objectKey, file.buffer, {
      headers: { 'Content-Type': file.mimetype },
    });

    return `${process.env.FILE_OSS_URL}${objectKey}`;
  }

  // 下面 CRUD 你可以按需实现或移除
  create(createOssDto: CreateOssDto) {
    return 'This action adds a new oss';
  }

  findAll() {
    return `This action returns all oss`;
  }

  findOne(id: number) {
    return `This action returns a #${id} oss`;
  }

  update(id: number, updateOssDto: UpdateOssDto) {
    return `This action updates a #${id} oss`;
  }

  remove(id: number) {
    return `This action removes a #${id} oss`;
  }
}
