import type { Express } from "express";
import { type Server } from "http";
import { randomUUID } from "crypto";
import path from "path";
import { storage } from "./storage";
import { registerSchema, guestSchema, sendOtpSchema, verifyOtpSchema, submitScoreSchema } from "@shared/schema";
import { generateOtpCode, sendOtpEmail } from "./otp";

const OTP_EXPIRY_MINUTES = 5;
const OTP_RATE_LIMIT = 3;
const OTP_RATE_WINDOW_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

const STATION_UNLOCK_CODES: Record<string, string> = {
  "TALLI30": "talli",
  "SADU30": "sadu",
  "SADDLE30": "saddle",
  "POTTERY30": "pottery",
  "SILK30": "silk",
  "ALKHOUS30": "alkhous",
};

const VALID_STATION_IDS = new Set(Object.values(STATION_UNLOCK_CODES));
const STATION_ORDER = ["talli", "sadu", "saddle", "pottery", "silk", "alkhous"];
const ADMIN_PIN = "DWC30ADMIN2024";

const verificationTokens = new Map<string, { stationId: string; participantId: string; expiresAt: number }>();

function generateVerificationToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/otp/send", async (req, res) => {
    try {
      const parsed = sendOtpSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request" });
      }

      const { identifier, type } = parsed.data;
      const normalized = identifier.trim().toLowerCase();

      const recentCount = await storage.getRecentOtpCount(normalized, OTP_RATE_WINDOW_MINUTES);
      if (recentCount >= OTP_RATE_LIMIT) {
        return res.status(429).json({ error: "rate_limited" });
      }

      if (type === "login") {
        const participant = await storage.findParticipantByIdentifier(normalized);
        if (!participant) {
          return res.status(404).json({ error: "not_found" });
        }
      }

      const code = generateOtpCode();
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      const sent = await sendOtpEmail(normalized, code);

      if (!sent) {
        return res.status(500).json({ error: "delivery_failed" });
      }

      await storage.createOtp({
        identifier: normalized,
        code,
        type,
        expiresAt,
        verified: false,
        consumed: false,
        attempts: 0,
      });

      res.json({ success: true, channel: "email" });
    } catch (err: any) {
      console.error("[OTP] Send error:", err);
      res.status(500).json({ error: "internal_error" });
    }
  });

  app.post("/api/otp/verify", async (req, res) => {
    try {
      const parsed = verifyOtpSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request" });
      }

      const { identifier, code, type } = parsed.data;
      const normalized = identifier.trim().toLowerCase();

      const result = await storage.findLatestOtpForVerification(normalized, type);

      if (result.status === "not_found") {
        return res.status(400).json({ error: "invalid_code" });
      }

      if (result.status === "expired") {
        return res.status(400).json({ error: "expired_code" });
      }

      const otp = result.otp;

      if (otp.attempts >= OTP_MAX_ATTEMPTS) {
        return res.status(400).json({ error: "too_many_attempts" });
      }

      if (otp.code !== code) {
        await storage.incrementOtpAttempts(otp.id);
        return res.status(400).json({ error: "invalid_code" });
      }

      const verificationToken = randomUUID();
      await storage.markOtpVerified(otp.id, verificationToken);
      res.json({ success: true, verified: true, verificationToken });
    } catch (err: any) {
      console.error("[OTP] Verify error:", err);
      res.status(500).json({ error: "internal_error" });
    }
  });

  app.post("/api/participants", async (req, res) => {
    try {
      const body = req.body;
      if (body.isGuest) {
        const participant = await storage.createParticipant({
          name: "Guest",
          mobile: "",
          email: "",
          instagram: "",
          consent: false,
          isGuest: true,
        });
        return res.json(participant);
      }

      const parsed = registerSchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const { verificationToken } = body;
      if (!verificationToken || typeof verificationToken !== "string") {
        return res.status(403).json({ error: "otp_not_verified" });
      }

      const otpIdentifier = parsed.data.email.trim().toLowerCase();
      const consumedOtp = await storage.consumeOtpByToken(verificationToken, otpIdentifier, "signup");
      if (!consumedOtp) {
        return res.status(403).json({ error: "otp_not_verified" });
      }

      const participant = await storage.createParticipant({
        ...parsed.data,
        isGuest: false,
      });
      res.json(participant);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/participants/login", async (req, res) => {
    try {
      const { identifier, verificationToken } = req.body;
      if (!identifier || typeof identifier !== "string") {
        return res.status(400).json({ error: "Identifier is required" });
      }
      if (!verificationToken || typeof verificationToken !== "string") {
        return res.status(403).json({ error: "otp_not_verified" });
      }

      const normalized = identifier.trim().toLowerCase();

      const consumedOtp = await storage.consumeOtpByToken(verificationToken, normalized, "login");
      if (!consumedOtp) {
        return res.status(403).json({ error: "otp_not_verified" });
      }

      const participant = await storage.findParticipantByIdentifier(normalized);
      if (!participant) {
        return res.status(404).json({ error: "No account found" });
      }
      res.json(participant);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/participants/:id", async (req, res) => {
    try {
      const participant = await storage.getParticipant(req.params.id);
      if (!participant) return res.status(404).json({ error: "Not found" });
      res.json(participant);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/participants/:id", async (req, res) => {
    try {
      const updated = await storage.updateParticipant(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "Not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/participants/:id/horse", async (req, res) => {
    try {
      const { baseHorse } = req.body;
      if (!["rebels_romance", "meydaan", "commissioner_king"].includes(baseHorse)) {
        return res.status(400).json({ error: "Invalid horse selection" });
      }
      const updated = await storage.updateParticipant(req.params.id, { baseHorse });
      if (!updated) return res.status(404).json({ error: "Not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/participants/:id/unlock", async (req, res) => {
    try {
      const { stationId, unlockToken } = req.body;

      if (!stationId || !VALID_STATION_IDS.has(stationId)) {
        return res.status(400).json({ error: "Invalid station ID" });
      }

      if (!unlockToken || typeof unlockToken !== "string") {
        return res.status(403).json({ error: "Verification token required" });
      }

      const tokenData = verificationTokens.get(unlockToken);
      if (!tokenData) {
        return res.status(403).json({ error: "Invalid or expired verification token" });
      }

      if (tokenData.expiresAt < Date.now()) {
        verificationTokens.delete(unlockToken);
        return res.status(403).json({ error: "Verification token expired" });
      }

      if (tokenData.stationId !== stationId) {
        return res.status(403).json({ error: "Token does not match station" });
      }

      if (tokenData.participantId !== req.params.id) {
        return res.status(403).json({ error: "Token does not match participant" });
      }

      verificationTokens.delete(unlockToken);

      const participant = await storage.getParticipant(req.params.id);
      if (!participant) return res.status(404).json({ error: "Not found" });

      const current = participant.unlockedStations || [];

      if (current.includes(stationId)) {
        return res.json(participant);
      }

      current.push(stationId);
      const newPoints = (participant.points || 0) + 50;
      const updated = await storage.updateParticipant(req.params.id, {
        unlockedStations: current,
        points: newPoints,
      });
      res.json(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  app.patch("/api/participants/:id/customize", async (req, res) => {
    try {
      const { stationId, optionId } = req.body;
      const participant = await storage.getParticipant(req.params.id);
      if (!participant) return res.status(404).json({ error: "Not found" });

      storage.logActivityEvent({
        participantId: req.params.id,
        eventType: "customize",
        stationId,
        metadata: { optionId },
      }).catch((err) => console.error("[activity] customize event log failed:", err));

      const customizations = (participant.customizations as Record<string, string>) || {};
      customizations[stationId] = optionId;
      const newPoints = (participant.points || 0) + 10;
      const updated = await storage.updateParticipant(req.params.id, {
        customizations,
        points: newPoints,
      });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/participants/:id/capture", async (req, res) => {
    try {
      const updated = await storage.updateParticipant(req.params.id, { hasCaptured: true });
      if (!updated) return res.status(404).json({ error: "Not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/participants/:id/share", async (req, res) => {
    try {
      const updated = await storage.updateParticipant(req.params.id, { hasShared: true });
      if (!updated) return res.status(404).json({ error: "Not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/participants", async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const allParticipants = await storage.getAllParticipants(search);
      const ids = allParticipants.map(p => p.id);
      const activityStats = await storage.getActivityStats(ids);
      const enriched = allParticipants.map(p => ({
        ...p,
        activityStats: activityStats[p.id] || { scanCount: 0, customizeCount: 0, customizeTimeSeconds: null },
      }));
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/participants/:id/activity", async (req, res) => {
    try {
      const participant = await storage.getParticipant(req.params.id);
      if (!participant) return res.status(404).json({ error: "Not found" });
      const events = await storage.getParticipantActivity(req.params.id);
      res.json({ participant, events });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/export", async (req, res) => {
    try {
      const all = await storage.getAllParticipants();
      const ids = all.map(p => p.id);
      const activityStats = await storage.getActivityStats(ids);
      const headers = ["ID", "Name", "Email", "Mobile", "Instagram", "Horse", "Progress", "Captured", "Shared", "Points", "Scans", "Customizations", "Time Spent (seconds)", "Created At"];
      const rows = all.map(p => {
        const custs = (p.customizations as Record<string, string>) || {};
        const stats = activityStats[p.id] || { scanCount: 0, customizeCount: 0, customizeTimeSeconds: null };
        return [
          p.id,
          `"${(p.name || "").replace(/"/g, '""')}"`,
          p.email,
          p.mobile,
          p.instagram,
          p.baseHorse || "",
          `${Object.keys(custs).length}/6`,
          p.hasCaptured ? "Yes" : "No",
          p.hasShared ? "Yes" : "No",
          p.points,
          stats.scanCount,
          stats.customizeCount,
          stats.customizeTimeSeconds ?? "",
          p.createdAt?.toISOString() || "",
        ].join(",");
      });
      const csv = [headers.join(","), ...rows].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=drc30-participants.csv");
      res.send(csv);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/stations/verify-code", async (req, res) => {
    try {
      const { participantId, code } = req.body;

      if (!participantId || typeof participantId !== "string") {
        return res.status(400).json({ success: false, error: "Participant ID is required" });
      }

      if (!code || typeof code !== "string") {
        return res.status(400).json({ success: false, error: "Code is required" });
      }

      const normalized = code.trim().toUpperCase();
      const stationId = STATION_UNLOCK_CODES[normalized];

      if (!stationId) {
        return res.json({ success: false, error: "invalid_code" });
      }

      const participant = await storage.getParticipant(participantId);
      if (!participant) {
        return res.status(404).json({ success: false, error: "Participant not found" });
      }

      storage.logActivityEvent({
        participantId,
        eventType: "scan",
        stationId,
      }).catch((err) => console.error("[activity] scan event log failed:", err));

      const unlocked = participant.unlockedStations || [];
      if (unlocked.includes(stationId)) {
        return res.json({ success: false, error: "already_unlocked", stationId });
      }

      const token = generateVerificationToken();
      verificationTokens.set(token, {
        stationId,
        participantId,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });

      return res.json({ success: true, stationId, unlockToken: token });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post("/api/admin/verify-pin", (req, res) => {
    const { pin } = req.body;
    if (pin === ADMIN_PIN) {
      return res.json({ success: true });
    }
    return res.status(403).json({ success: false, error: "Invalid PIN" });
  });

  app.post("/api/admin/station-qr-all", async (req, res) => {
    const { pin } = req.body;
    if (pin !== ADMIN_PIN) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const QRCode = await import("qrcode");
      const sharp = (await import("sharp")).default;
      const logoPath = path.resolve(process.cwd(), "client/src/assets/images/dwc-30th-logo-04-cropped.png");
      const stationNames: Record<string, string> = {
        talli: "The Art of Talli — Emirati Heritage Craft",
        sadu: "Sadu Weaving — Bedouin Textiles",
        saddle: "Arabian Saddle Making — Leather Craftsmanship",
        pottery: "Arabian Pottery — Clay Sculpting",
        silk: "Luxury Fabric — Refined Textiles",
        alkhous: "Al Khous — Palm Leaf Weaving",
      };
      const results = [];
      for (const [code, stationId] of Object.entries(STATION_UNLOCK_CODES)) {
        const qrBuffer = await QRCode.default.toBuffer(code, {
          width: 600,
          margin: 2,
          color: { dark: "#1a1a1a", light: "#ffffff" },
          errorCorrectionLevel: "H",
        });
        const logoResized = await sharp(logoPath)
          .resize(140, 50, { fit: "inside", background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .toBuffer();
        const logoMeta = await sharp(logoResized).metadata();
        const logoW = logoMeta.width || 140;
        const logoH = logoMeta.height || 50;
        const padded = await sharp({
          create: { width: logoW + 12, height: logoH + 12, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
        }).composite([{ input: logoResized, left: 6, top: 6 }]).png().toBuffer();
        const paddedMeta = await sharp(padded).metadata();
        const pW = paddedMeta.width || (logoW + 12);
        const pH = paddedMeta.height || (logoH + 12);
        const composited = await sharp(qrBuffer)
          .composite([{
            input: padded,
            left: Math.round((600 - pW) / 2),
            top: Math.round((600 - pH) / 2),
          }])
          .png()
          .toBuffer();
        const qrDataUrl = `data:image/png;base64,${composited.toString("base64")}`;
        results.push({ stationId, code, qrDataUrl, stationName: stationNames[stationId] || stationId });
      }
      res.json(results);
    } catch (err) {
      console.error("QR generation error:", err);
      res.status(500).json({ error: "Failed to generate QR codes" });
    }
  });

  app.post("/api/race/submit-score", async (req, res) => {
    try {
      const parsed = submitScoreSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const score = await storage.createRaceScore({
        participantId: parsed.data.participantId || null,
        horseName: parsed.data.horseName,
        horseId: parsed.data.horseId,
        trackType: parsed.data.trackType,
        finishTime: parsed.data.finishTime,
        rank: parsed.data.rank,
      });
      res.json(score);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/race/leaderboard", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const scores = await storage.getLeaderboard(limit);
      res.json(scores);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  setInterval(() => {
    storage.cleanupExpiredOtps().catch(console.error);
    const now = Date.now();
    for (const [key, val] of verificationTokens) {
      if (val.expiresAt < now) verificationTokens.delete(key);
    }
  }, 30 * 60 * 1000);

  return httpServer;
}
