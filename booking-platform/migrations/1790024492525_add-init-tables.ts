import { type ColumnDefinitions, type MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addExtension('btree_gist')

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
    name: { type: 'varchar(200)', notNull: true },
    description: { type: 'text' },
    active: { type: 'boolean', notNull: true, default: true },
    duration_minutes: {
      type: 'integer',
      notNull: true,
    },
  });
  pgm.addConstraint('services', 'duration_minutes_greater_than_0', {
    check: 'duration_minutes > 0'
  })

  pgm.createTable('bookings', {
    id: 'id',
    provider_id: {
      type: 'integer',
      notNull: true,
      references: '"providers"',
      onDelete: 'CASCADE',
    },
    service_id: {
      type: 'integer',
      notNull: true,
      references: '"services"',
      onDelete: 'RESTRICT',
    },
    customer_name: { type: 'varchar(200)', notNull: true },
    customer_email: { type: 'varchar(200)', notNull: true },
    customer_phone: { type: 'varchar(50)', notNull: true },
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
  pgm.addConstraint('bookings', 'bookings_end_after_start', {
    check: 'start_at < end_at'
  })
  pgm.addConstraint('bookings', 'overlap_bookings', {
    exclude: 'USING gist (provider_id WITH =, tstzrange(start_at, end_at) WITH &&)'
  })

  pgm.createTable('availability_rules', {
    id: 'id',
    provider_id: {
      type: 'integer',
      notNull: true,
      references: '"providers"',
      onDelete: 'CASCADE',
    },
    day_of_week: { type: 'smallint', notNull: true },
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
  pgm.addConstraint('availability_rules', 'availability_rules_between_0_to_6', {
    check: 'day_of_week BETWEEN 0 AND 6'
  })

}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('availability_rules', { ifExists: true })
  pgm.dropTable('bookings', { ifExists: true })
  pgm.dropTable('services', { ifExists: true })
  pgm.dropTable('blocked_periods', { ifExists: true })
  pgm.dropTable('providers', { ifExists: true })
}
