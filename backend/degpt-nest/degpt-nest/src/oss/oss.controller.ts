import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { OssService } from './oss.service';
import { CreateOssDto } from './dto/create-oss.dto';
import { UpdateOssDto } from './dto/update-oss.dto';

@Controller('oss')
export class OssController {
  constructor(private readonly ossService: OssService) {}

  // 新增：上传接口
  // POST /oss/upload
  // form-data:
  // - files: file (可多选)
  // - dir: string (可选，上传到 OSS 的目录前缀)
  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB/文件，按需改
      fileFilter: (req, file, cb) => {
        // 如需只允许图片：file.mimetype.startsWith('image/')
        cb(null, true);
      },
    }),
  )
  async upload(@UploadedFiles() files: any, @Body('dir') dir?: string) {
    if (!files || files.length === 0) {
      throw new BadRequestException('files is required');
    }
    return this.ossService.uploadFiles(files, dir);
  }

  // 下面 CRUD 你可以保留（也可以删掉不用）
  @Post()
  create(@Body() createOssDto: CreateOssDto) {
    return this.ossService.create(createOssDto);
  }

  @Get()
  findAll() {
    return this.ossService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ossService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOssDto: UpdateOssDto) {
    return this.ossService.update(+id, updateOssDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ossService.remove(+id);
  }
}
