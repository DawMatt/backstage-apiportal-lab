// packages/backend/src/extensions/autoApiRegistrationMigrations/001_scan_state_cache.ts
//
// Scan-state cache for the autoApiRegistration EntityProvider. Not a catalog table — internal
// state private to this backend module, used to avoid re-parsing unchanged files on restart, to
// compute delta mutations, and to support collision/precedence checks across every configured
// source.
//
// Applied via a knex custom `migrationSource` (see autoApiRegistration.ts) rather than a
// filesystem `directory` migration source, since this file lives alongside the module's
// TypeScript source rather than in a package-level `migrations/` folder resolved at runtime.

import type { Knex } from 'knex';

export const TABLE_NAME = 'auto_api_registration_scan_state';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, table => {
    table.string('source_id').notNullable();
    table.string('file_path').notNullable();
    table.bigInteger('mtime_ms').notNullable();
    table.string('content_hash').notNullable();
    table.string('entity_name').notNullable();
    table.text('last_error').nullable();

    table.primary(['source_id', 'file_path']);
    table.index(['entity_name'], 'auto_api_registration_scan_state_entity_name_idx');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(TABLE_NAME);
}
