import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @SkipThrottle()
  getHealth(): { status: string } {
    return this.appService.getHealth();
  }

  @Get('ready')
  @SkipThrottle()
  async getReady(): Promise<{ status: string }> {
    return this.appService.getReady();
  }
}
