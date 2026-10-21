import { pgTable, text, timestamp, jsonb, integer, uuid, index } from 'drizzle-orm/pg-core';

export const resumeProfiles = pgTable('resume_profiles', {
  userId: text('user_id').primaryKey(),
  data: jsonb('data').$type<Record<string, any>>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const interviewReports = pgTable('interview_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  data: jsonb('data').$type<Record<string, any>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('interview_reports_user_created_idx').on(table.userId, table.createdAt)]);

export const generationLimits = pgTable('generation_limits', {
  userId: text('user_id').primaryKey(),
  count: integer('count').notNull(),
  resetsAt: timestamp('resets_at', { withTimezone: true }).notNull(),
});
