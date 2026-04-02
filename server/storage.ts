import { eq, desc, sql, ilike, or, and, gt, lt, asc, inArray } from "drizzle-orm";
import { db } from "./db";
import { participants, otpCodes, raceScores, activityEvents, type Participant, type InsertParticipant, type OtpCode, type InsertOtpCode, type RaceScore, type InsertRaceScore, type ActivityEvent, type InsertActivityEvent } from "@shared/schema";

export type OtpLookupResult =
  | { status: "found"; otp: OtpCode }
  | { status: "expired" }
  | { status: "not_found" };

export interface IStorage {
  createParticipant(data: InsertParticipant): Promise<Participant>;
  getParticipant(id: string): Promise<Participant | undefined>;
  findParticipantByMobile(mobile: string): Promise<Participant | undefined>;
  findParticipantByEmail(email: string): Promise<Participant | undefined>;
  findParticipantByIdentifier(identifier: string): Promise<Participant | undefined>;
  updateParticipant(id: string, data: Partial<InsertParticipant>): Promise<Participant | undefined>;
  getAllParticipants(search?: string): Promise<Participant[]>;
  getStats(): Promise<{ total: number; completed: number; captured: number }>;
  createOtp(data: InsertOtpCode): Promise<OtpCode>;
  getRecentOtpCount(identifier: string, windowMinutes: number): Promise<number>;
  findLatestOtpForVerification(identifier: string, type: string): Promise<OtpLookupResult>;
  markOtpVerified(id: string, token: string): Promise<void>;
  consumeOtpByToken(token: string, expectedIdentifier: string, expectedType: string): Promise<OtpCode | undefined>;
  incrementOtpAttempts(id: string): Promise<void>;
  cleanupExpiredOtps(): Promise<void>;
  createRaceScore(data: InsertRaceScore): Promise<RaceScore>;
  getLeaderboard(limit?: number): Promise<RaceScore[]>;
  logActivityEvent(data: InsertActivityEvent): Promise<ActivityEvent>;
  getActivityStats(participantIds: string[]): Promise<Record<string, { scanCount: number; customizeCount: number; customizeTimeSeconds: number | null }>>;
  getParticipantActivity(participantId: string): Promise<ActivityEvent[]>;
}

export class DatabaseStorage implements IStorage {
  async createParticipant(data: InsertParticipant): Promise<Participant> {
    const [participant] = await db.insert(participants).values(data).returning();
    return participant;
  }

  async getParticipant(id: string): Promise<Participant | undefined> {
    const [participant] = await db.select().from(participants).where(eq(participants.id, id));
    return participant;
  }

  async findParticipantByMobile(mobile: string): Promise<Participant | undefined> {
    const normalized = mobile.replace(/\s+/g, "");
    const [participant] = await db.select().from(participants)
      .where(sql`replace(${participants.mobile}, ' ', '') = ${normalized}`)
      .orderBy(desc(participants.createdAt));
    return participant;
  }

  async findParticipantByEmail(email: string): Promise<Participant | undefined> {
    const normalized = email.trim().toLowerCase();
    const [participant] = await db.select().from(participants)
      .where(sql`lower(trim(${participants.email})) = ${normalized}`)
      .orderBy(desc(participants.createdAt));
    return participant;
  }

  async findParticipantByIdentifier(identifier: string): Promise<Participant | undefined> {
    return this.findParticipantByEmail(identifier);
  }

  async updateParticipant(id: string, data: Partial<InsertParticipant>): Promise<Participant | undefined> {
    const [updated] = await db.update(participants).set(data).where(eq(participants.id, id)).returning();
    return updated;
  }

  async getAllParticipants(search?: string): Promise<Participant[]> {
    if (search) {
      const pattern = `%${search}%`;
      return db.select().from(participants).where(
        or(
          ilike(participants.name, pattern),
          ilike(participants.email, pattern),
          ilike(participants.instagram, pattern)
        )
      ).orderBy(desc(participants.createdAt));
    }
    return db.select().from(participants).orderBy(desc(participants.createdAt));
  }

  async getStats(): Promise<{ total: number; completed: number; captured: number }> {
    const [totalResult] = await db.select({ count: sql<number>`count(*)::int` }).from(participants);
    const [capturedResult] = await db.select({ count: sql<number>`count(*)::int` }).from(participants).where(eq(participants.hasCaptured, true));

    let completedCount = 0;
    try {
      const [completedResult] = await db.select({
        count: sql<number>`count(*)::int`
      }).from(participants).where(
        sql`jsonb_typeof(${participants.customizations}) = 'object' AND (select count(*) from jsonb_object_keys(${participants.customizations})) >= 6`
      );
      completedCount = completedResult?.count ?? 0;
    } catch {}

    return {
      total: totalResult?.count ?? 0,
      completed: completedCount,
      captured: capturedResult?.count ?? 0,
    };
  }

  async createOtp(data: InsertOtpCode): Promise<OtpCode> {
    const [otp] = await db.insert(otpCodes).values(data).returning();
    return otp;
  }

  async getRecentOtpCount(identifier: string, windowMinutes: number): Promise<number> {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.identifier, identifier),
          gt(otpCodes.createdAt, since)
        )
      );
    return result?.count ?? 0;
  }

  async findLatestOtpForVerification(identifier: string, type: string): Promise<OtpLookupResult> {
    const [latestOtp] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.identifier, identifier),
          eq(otpCodes.type, type),
          eq(otpCodes.verified, false),
          eq(otpCodes.consumed, false)
        )
      )
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);

    if (!latestOtp) {
      return { status: "not_found" };
    }

    if (latestOtp.expiresAt < new Date()) {
      return { status: "expired" };
    }

    return { status: "found", otp: latestOtp };
  }

  async markOtpVerified(id: string, token: string): Promise<void> {
    await db.update(otpCodes)
      .set({ verified: true, verificationToken: token })
      .where(eq(otpCodes.id, id));
  }

  async consumeOtpByToken(token: string, expectedIdentifier: string, expectedType: string): Promise<OtpCode | undefined> {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const [otp] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.verificationToken, token),
          eq(otpCodes.verified, true),
          eq(otpCodes.consumed, false),
          eq(otpCodes.identifier, expectedIdentifier),
          eq(otpCodes.type, expectedType),
          gt(otpCodes.createdAt, fiveMinAgo)
        )
      )
      .limit(1);

    if (otp) {
      await db.update(otpCodes)
        .set({ consumed: true })
        .where(eq(otpCodes.id, otp.id));
    }

    return otp;
  }

  async incrementOtpAttempts(id: string): Promise<void> {
    await db.update(otpCodes)
      .set({ attempts: sql`${otpCodes.attempts} + 1` })
      .where(eq(otpCodes.id, id));
  }

  async cleanupExpiredOtps(): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await db.delete(otpCodes).where(
      or(
        lt(otpCodes.expiresAt, now),
        and(eq(otpCodes.consumed, true), lt(otpCodes.createdAt, oneHourAgo))
      )
    );
  }

  async createRaceScore(data: InsertRaceScore): Promise<RaceScore> {
    const [score] = await db.insert(raceScores).values(data).returning();
    return score;
  }

  async getLeaderboard(limit: number = 50): Promise<RaceScore[]> {
    return db
      .select()
      .from(raceScores)
      .orderBy(asc(raceScores.finishTime))
      .limit(limit);
  }

  async logActivityEvent(data: InsertActivityEvent): Promise<ActivityEvent> {
    const [event] = await db.insert(activityEvents).values(data).returning();
    return event;
  }

  async getParticipantActivity(participantId: string): Promise<ActivityEvent[]> {
    return db.select().from(activityEvents)
      .where(eq(activityEvents.participantId, participantId))
      .orderBy(desc(activityEvents.createdAt));
  }

  async getActivityStats(participantIds: string[]): Promise<Record<string, { scanCount: number; customizeCount: number; customizeTimeSeconds: number | null }>> {
    if (participantIds.length === 0) return {};

    const rows = await db.select({
      participantId: activityEvents.participantId,
      scanCount: sql<number>`count(*) filter (where ${activityEvents.eventType} = 'scan')::int`,
      customizeCount: sql<number>`count(*) filter (where ${activityEvents.eventType} = 'customize')::int`,
      customizeTimeSeconds: sql<number>`extract(epoch from (max(${activityEvents.createdAt}) filter (where ${activityEvents.eventType} = 'customize') - min(${activityEvents.createdAt}) filter (where ${activityEvents.eventType} = 'customize')))::int`,
    })
    .from(activityEvents)
    .where(inArray(activityEvents.participantId, participantIds))
    .groupBy(activityEvents.participantId);

    const result: Record<string, { scanCount: number; customizeCount: number; customizeTimeSeconds: number | null }> = {};
    for (const row of rows) {
      result[row.participantId] = {
        scanCount: row.scanCount ?? 0,
        customizeCount: row.customizeCount ?? 0,
        customizeTimeSeconds: row.customizeTimeSeconds,
      };
    }
    return result;
  }
}

export const storage = new DatabaseStorage();
