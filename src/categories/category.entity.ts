import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 16, default: 'expense' })
  type!: 'expense' | 'income';

  @Column({ type: 'varchar', length: 16, default: '#3b82f6' })
  color!: string;
}
