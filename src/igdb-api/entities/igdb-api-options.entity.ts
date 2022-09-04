import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

const IGDB_API_OPTIONS_TABLE_NAME = 'igdb_api_options';

// TODO: use clientId as a primary column

@Entity(IGDB_API_OPTIONS_TABLE_NAME)
export class IgdbApiOptions {
  static readonly tableName = IGDB_API_OPTIONS_TABLE_NAME;

  @PrimaryColumn()
  id: number;

  @Column()
  accessToken: string;

  @Column()
  expiresIn: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
