import { type ColumnDefinitions, type MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('providers', {
    id: 'id',
    name: { type: 'varchar(200)', notNull: true },
    timezone: {
      type: 'text',
      notNull: true,
    },
    'created_at': {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createTable('blocked_periods', {
    id: 'id',
    provider_id: {
      type: 'integer',
      notNull: true,
      references: '"providers"',
      onDelete: 'CASCADE',
    },
    name: { type: 'varchar(200)' },
    'start_at': {
      type: 'timestamptz',
      notNull: true,
    },
    'end_at': {
      type: 'timestamptz',
      notNull: true,
    },
  });
  pgm.addConstraint('blocked_periods', 'blocked_periods_end_after_start', {
    check: 'start_at < end_at'
  })

  pgm.createTable('services', {
    id: 'id',
    provider_id: {
      type: 'integer',
      notNull: true,
      references: '"providers"',
      onDelete: 'CASCADE',
    },
    name: { type: 'varchar(200)' },
    duration: {
      type: 'integer',
      notNull: true,
    },
  });

  pgm.createTable('bookings', {
    id: 'id',
    provider_id: {
      type: 'integer',
      notNull: true,
      references: '"providers"',
      onDelete: 'CASCADE',
    },
    services_id: {
      type: 'integer',
      notNull: true,
      references: '"services"',
      onDelete: 'CASCADE',
    },
    customer_name: { type: 'varchar(200)' },
    customer_email: { type: 'varchar(200)' },
    customer_phone: { type: 'varchar(50)' },
    'start_at': {
      type: 'timestamptz',
      notNull: true,
    },
    'end_at': {
      type: 'timestamptz',
      notNull: true,
    },
    'created_at': {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createTable('availability_rules', {
    id: 'id',
    provider_id: {
      type: 'integer',
      notNull: true,
      references: '"providers"',
      onDelete: 'CASCADE',
    },
    day_of_week: { type: 'varchar(200)' },
    'start_time': {
      type: 'time',
      notNull: true,
    },
    'end_time': {
      type: 'time',
      notNull: true,
    },
    'created_at': {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('availability_rules', { ifExists: true })
  pgm.dropTable('bookings', { ifExists: true })
  pgm.dropTable('services', { ifExists: true })
  pgm.dropTable('blocked_periods', { ifExists: true })
  pgm.dropTable('providers', { ifExists: true })
}
