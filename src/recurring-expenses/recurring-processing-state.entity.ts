import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('recurring_processing_state')
export class RecurringProcessingState {
  @PrimaryColumn({ type: 'integer' })
  id!: number;

  @Column({ type: 'date', nullable: true })
  lastProcessedDate?: string | null;
}

