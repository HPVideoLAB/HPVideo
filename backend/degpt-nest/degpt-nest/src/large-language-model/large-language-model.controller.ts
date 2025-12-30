import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
} from '@nestjs/common';
import { LargeLanguageModelService } from './large-language-model.service';
import { CreateLargeLanguageModelDto } from './dto/create-large-language-model.dto';
import { UpdateLargeLanguageModelDto } from './dto/update-large-language-model.dto';
import type { Response } from 'express';

@Controller('large-language-model')
export class LargeLanguageModelController {
  constructor(
    private readonly largeLanguageModelService: LargeLanguageModelService,
  ) {}

  @Post()
  create(@Body() createLargeLanguageModelDto: CreateLargeLanguageModelDto) {
    return this.largeLanguageModelService.create(createLargeLanguageModelDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate',
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    return this.largeLanguageModelService.findOne(id);
  }
}
