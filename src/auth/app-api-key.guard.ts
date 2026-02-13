import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class AppApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedKey = process.env.APP_API_KEY;
    if (!expectedKey) {
      throw new ServiceUnavailableException('APP_API_KEY is not configured');
    }

    const req = context.switchToHttp().getRequest<Request>();
    const provided = req.headers['x-api-key'];
    const apiKey = Array.isArray(provided) ? provided[0] : provided;

    if (!apiKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
