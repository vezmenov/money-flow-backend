import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Category } from '../categories/category.entity';

@Entity('recurring_expenses')
export class RecurringExpense {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category!: Category;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'integer' })
  dayOfMonth!: number;

  // Anchor start date. Recurring expense is active for months where scheduledDate >= date.
  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;
}

