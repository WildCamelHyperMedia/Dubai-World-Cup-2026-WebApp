import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const participants = pgTable("participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  mobile: text("mobile").notNull(),
  email: text("email").notNull(),
  instagram: text("instagram").notNull(),
  consent: boolean("consent").notNull().default(false),
  isGuest: boolean("is_guest").notNull().default(false),
  baseHorse: text("base_horse"),
  customizations: jsonb("customizations").$type<Record<string, string>>().default({}),
  unlockedStations: text("unlocked_stations").array().default(sql`ARRAY[]::text[]`),
  points: integer("points").notNull().default(0),
  hasCaptured: boolean("has_captured").notNull().default(false),
  hasShared: boolean("has_shared").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const otpCodes = pgTable("otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  identifier: text("identifier").notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  type: text("type").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").notNull().default(false),
  consumed: boolean("consumed").notNull().default(false),
  attempts: integer("attempts").notNull().default(0),
  verificationToken: varchar("verification_token"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertParticipantSchema = createInsertSchema(participants).omit({
  id: true,
  createdAt: true,
});

export const registerSchema = z.object({
  name: z.string().min(1),
  mobile: z.string().min(1),
  email: z.string().email(),
  instagram: z.string().optional().default(""),
  consent: z.boolean(),
});

export const guestSchema = z.object({
  isGuest: z.literal(true),
});

export const sendOtpSchema = z.object({
  identifier: z.string().min(1),
  type: z.enum(["signup", "login"]),
});

export const verifyOtpSchema = z.object({
  identifier: z.string().min(1),
  code: z.string().length(6),
  type: z.enum(["signup", "login"]),
});

export const insertOtpSchema = createInsertSchema(otpCodes).omit({
  id: true,
  createdAt: true,
});

export const activityEvents = pgTable("activity_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id").notNull(),
  eventType: text("event_type").notNull(),
  stationId: text("station_id"),
  metadata: jsonb("metadata").$type<Record<string, string>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivityEventSchema = createInsertSchema(activityEvents).omit({
  id: true,
  createdAt: true,
});

export type ActivityEvent = typeof activityEvents.$inferSelect;
export type InsertActivityEvent = z.infer<typeof insertActivityEventSchema>;

export const raceScores = pgTable("race_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id"),
  horseName: text("horse_name").notNull(),
  horseId: text("horse_id").notNull(),
  trackType: text("track_type").notNull(),
  finishTime: integer("finish_time").notNull(),
  rank: integer("rank").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRaceScoreSchema = createInsertSchema(raceScores).omit({
  id: true,
  createdAt: true,
});

export const submitScoreSchema = z.object({
  participantId: z.string().optional(),
  horseName: z.string().min(1),
  horseId: z.string().min(1),
  trackType: z.enum(["short", "long"]),
  finishTime: z.number().int().positive(),
  rank: z.number().int().min(1).max(4),
});

export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Participant = typeof participants.$inferSelect;
export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = z.infer<typeof insertOtpSchema>;
export type RaceScore = typeof raceScores.$inferSelect;
export type InsertRaceScore = z.infer<typeof insertRaceScoreSchema>;
