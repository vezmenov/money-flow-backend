import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class OpenClawApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedKey = process.env.OPENCLAW_API_KEY;
    if (!expectedKey) {
      throw new ServiceUnavailableException('OPENCLAW_API_KEY is not configured');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const actualKey = request.headers?.['x-api-key'];
    if (!actualKey || actualKey !== expectedKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
