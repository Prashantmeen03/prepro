import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { generationLimits, interviewReports, resumeProfiles } from '../db/schema.js';
import { HttpError, profileSchema } from './validation.js';

export function createStore() {
  const db = getDb();
  return {
    async getProfile(userId: string, username: string, email: string) {
      const initial = profileSchema.parse({ personalInfo: { fullName: username, email } });
      await db.insert(resumeProfiles).values({ userId, data: initial }).onConflictDoNothing();
      const [row] = await db.select().from(resumeProfiles).where(eq(resumeProfiles.userId, userId));
      return { ...row.data, user: userId, updatedAt: row.updatedAt.toISOString() };
    },
    async updateProfile(userId: string, patch: Record<string, unknown>) {
      const [row] = await db.update(resumeProfiles).set({
        data: sql`${resumeProfiles.data} || ${JSON.stringify(patch)}::jsonb`,
        updatedAt: new Date(),
      }).where(eq(resumeProfiles.userId, userId)).returning();
      return { ...row.data, user: userId, updatedAt: row.updatedAt.toISOString() };
    },
    async listReports(userId: string) {
      const rows = await db.select().from(interviewReports).where(eq(interviewReports.userId, userId)).orderBy(desc(interviewReports.createdAt));
      return rows.map(row => {
        const { resume, selfDescription, jobDescription, technicalQuestions, behavioralQuestions, skillGaps, preparationPlan, ...summary } = row.data;
        return { ...summary, _id: row.id, createdAt: row.createdAt.toISOString() };
      });
    },
    async getReport(userId: string, id: string) {
      const [row] = await db.select().from(interviewReports).where(and(eq(interviewReports.id, id), eq(interviewReports.userId, userId)));
      if (!row) throw new HttpError(404, 'Interview report not found.');
      return { ...row.data, _id: row.id, createdAt: row.createdAt.toISOString() };
    },
    async addReport(userId: string, data: Record<string, unknown>) {
      const [row] = await db.insert(interviewReports).values({ userId, data }).returning();
      return { ...row.data, _id: row.id, createdAt: row.createdAt.toISOString() };
    },
    async limitGeneration(userId: string) {
      const [row] = await db.insert(generationLimits).values({ userId, count: 1, resetsAt: new Date(Date.now() + 300000) }).onConflictDoUpdate({
        target: generationLimits.userId,
        set: {
          count: sql`CASE WHEN ${generationLimits.resetsAt} <= now() THEN 1 ELSE ${generationLimits.count} + 1 END`,
          resetsAt: sql`CASE WHEN ${generationLimits.resetsAt} <= now() THEN now() + interval '5 minutes' ELSE ${generationLimits.resetsAt} END`,
        },
      }).returning();
      if (row.count > 10) throw new HttpError(429, 'Generation limit reached. Please try again in five minutes.');
    },
    async health() {
      await db.select({ userId: resumeProfiles.userId }).from(resumeProfiles).limit(1);
    },
  };
}

export type Store = ReturnType<typeof createStore>;
