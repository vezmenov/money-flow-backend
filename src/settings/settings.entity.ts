import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('settings')
export class Settings {
  @PrimaryColumn({ type: 'integer' })
  id!: number;

  // UTC offset in "+HH:MM" format. Single-user for now.
  @Column({ type: 'varchar', length: 6, default: '+03:00' })
  utcOffset!: string;
}
