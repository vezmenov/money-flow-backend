import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { UpdateTimezoneDto } from './dto/update-timezone.dto';
import { SettingsService } from './settings.service';
import { AppApiKeyGuard } from '../auth/app-api-key.guard';

@Controller('settings')
@UseGuards(AppApiKeyGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('timezone')
  async getTimezone(): Promise<{ utcOffset: string }> {
    return this.settingsService.getTimezone();
  }

  @Put('timezone')
  async updateTimezone(@Body() payload: UpdateTimezoneDto): Promise<{ utcOffset: string }> {
    return this.settingsService.updateTimezone(payload.utcOffset);
  }
}
