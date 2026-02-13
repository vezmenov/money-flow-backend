import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'job_locks' })
export class JobLock {
  @PrimaryColumn({ type: 'varchar' })
  name!: string;

  // Unix epoch seconds.
  @Column({ type: 'integer', default: 0 })
  lockedUntil!: number;

  @Column({ type: 'varchar', default: '' })
  lockedBy!: string;
}
