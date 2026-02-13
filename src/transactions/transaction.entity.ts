import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Category } from '../categories/category.entity';

@Index('IDX_transactions_source_idempotencyKey', ['source', 'idempotencyKey'], {
  unique: true,
})
@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32, default: 'manual' })
  source!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  idempotencyKey?: string | null;

  @Column({ type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category!: Category;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;
}
