import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AppApiKeyGuard } from '../auth/app-api-key.guard';
import { ExportsService } from './exports.service';

@Controller('export')
@UseGuards(AppApiKeyGuard)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('xlsx')
  async exportXlsx(@Res() res: Response): Promise<void> {
    const buffer = await this.exportsService.buildXlsx();

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="money-flow-export.xlsx"',
      'Content-Length': String(buffer.length),
      'Cache-Control': 'no-store',
    });

    res.status(200).send(buffer);
  }
}
