import { Controller, Get, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'node:fs';
import { AppApiKeyGuard } from '../auth/app-api-key.guard';
import { BackupsService } from './backups.service';

@Controller('backup')
@UseGuards(AppApiKeyGuard)
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Get('sqlite')
  async downloadSqliteBackup(@Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const { filePath, fileName } = await this.backupsService.createSqliteGzipBackup();

    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    return new StreamableFile(fs.createReadStream(filePath));
  }
}
