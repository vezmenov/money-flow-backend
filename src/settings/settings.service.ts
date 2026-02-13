import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from './settings.entity';

const DEFAULT_UTC_OFFSET = '+03:00';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
  ) {}

  async getTimezone(): Promise<{ utcOffset: string }> {
    const settings = await this.ensureSettingsRow();
    return { utcOffset: settings.utcOffset };
  }

  async updateTimezone(input: string): Promise<{ utcOffset: string }> {
    const utcOffset = normalizeUtcOffset(input);
    const settings = await this.ensureSettingsRow();
    settings.utcOffset = utcOffset;
    await this.settingsRepository.save(settings);
    return { utcOffset };
  }

  async getUtcOffsetMinutes(): Promise<number> {
    const settings = await this.ensureSettingsRow();
    return parseUtcOffsetMinutes(settings.utcOffset);
  }

  private async ensureSettingsRow(): Promise<Settings> {
    const id = 1;
    let settings = await this.settingsRepository.findOneBy({ id });
    if (!settings) {
      settings = this.settingsRepository.create({ id, utcOffset: DEFAULT_UTC_OFFSET });
      return this.settingsRepository.save(settings);
    }

    if (!settings.utcOffset) {
      settings.utcOffset = DEFAULT_UTC_OFFSET;
      return this.settingsRepository.save(settings);
    }

    return settings;
  }
}

export function parseUtcOffsetMinutes(utcOffset: string): number {
  const s = normalizeUtcOffset(utcOffset);

  const sign = s[0] === '-' ? -1 : 1;
  const hours = Number(s.slice(1, 3));
  const minutes = Number(s.slice(4, 6));
  return sign * (hours * 60 + minutes);
}

export function normalizeUtcOffset(input: string): string {
  let s = String(input ?? '').trim();
  if (!s) {
    throw new BadRequestException('utcOffset is required');
  }

  // Accept "UTC+3", "UTC-5", "UTC+03:00"
  if (s.toUpperCase().startsWith('UTC')) {
    s = s.slice(3).trim();
  }

  s = s.replace(/\s+/g, '');

  let sign: string;
  let hoursStr: string;
  let minutesStr: string;

  // "+3" / "-11"
  const m1 = s.match(/^([+-])(\d{1,2})$/);
  if (m1) {
    sign = m1[1];
    hoursStr = m1[2];
    minutesStr = '00';
  } else {
    // "+03:00" / "-05:30"
    const m2 = s.match(/^([+-])(\d{1,2}):(\d{2})$/);
    if (m2) {
      sign = m2[1];
      hoursStr = m2[2];
      minutesStr = m2[3];
    } else {
      // "+0300" / "-0530"
      const m3 = s.match(/^([+-])(\d{2})(\d{2})$/);
      if (m3) {
        sign = m3[1];
        hoursStr = m3[2];
        minutesStr = m3[3];
      } else {
        throw new BadRequestException(
          'utcOffset must be like "+03:00", "-05:00", "UTC+3", or "UTC-5"',
        );
      }
    }
  }

  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    throw new BadRequestException('utcOffset is invalid');
  }

  if (hours < 0 || hours > 14) {
    throw new BadRequestException('utcOffset hours must be between 0 and 14');
  }

  if (minutes < 0 || minutes > 59) {
    throw new BadRequestException('utcOffset minutes must be between 00 and 59');
  }

  const total = hours * 60 + minutes;
  if (total > 14 * 60) {
    throw new BadRequestException('utcOffset must be within ±14:00');
  }

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

