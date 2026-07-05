// packages/backend/src/extensions/autoApiRegistrationMigrations/002_add_system_slug.ts
//
// Lab 6: adds the column that lets the scan-state cache remember which logical-API grouping
// (info.x-<namespace>.apiBasename, slugified) each registered file last resolved to, so the
// provider can synthesize/refresh the matching System entity across cycles without re-parsing
// every file every time. Nullable — files with no apiBasename simply never populate it.

import type { Knex } from 'knex';
import { TABLE_NAME } from './001_scan_state_cache';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(TABLE_NAME, table => {
    table.string('system_slug').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(TABLE_NAME, table => {
    table.dropColumn('system_slug');
  });
}
