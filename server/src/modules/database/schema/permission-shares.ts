import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { specPermissions } from './spec-permissions.js';
import { users } from './users.js';

export const permissionShares = pgTable('permission_shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  specPermissionId: uuid('spec_permission_id')
    .notNull()
    .references(() => specPermissions.id),
  sharedWithUserId: uuid('shared_with_user_id')
    .notNull()
    .references(() => users.id),
  sharedByUserId: uuid('shared_by_user_id')
    .notNull()
    .references(() => users.id),
  accessLevel: varchar('access_level', { length: 20 })
    .notNull()
    .default('summary'),
  sharedAt: timestamp('shared_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});
