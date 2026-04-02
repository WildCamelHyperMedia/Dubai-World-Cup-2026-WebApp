import { randomInt } from "crypto";

const RESEND_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || "DWC 30th Anniversary <noreply@drc30.ae>";

export function generateOtpCode(): string {
  return randomInt(100000, 1000000).toString();
}

export async function sendOtpEmail(to: string, code: string): Promise<boolean> {
  if (!RESEND_KEY) {
    if (process.env.NODE_ENV === "production") {
      console.error("[OTP] Resend API key not configured in production");
      return false;
    }
    console.warn("[OTP] DEV MODE — Resend not configured. Code:", code, "for", to);
    return true;
  }

  try {
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0A0908;color:#fff;padding:40px 30px;border-radius:16px;">
        <h2 style="color:#D7B07A;text-align:center;font-size:22px;margin-bottom:8px;">Dubai World Cup</h2>
        <p style="color:#999;text-align:center;font-size:13px;margin-bottom:30px;">30th Anniversary Interactive Journey</p>
        <p style="color:#ccc;font-size:14px;margin-bottom:24px;">Your verification code is:</p>
        <div style="background:#15110D;border:2px solid #D7B07A;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
          <span style="color:#D7B07A;font-size:32px;letter-spacing:8px;font-weight:bold;">${code}</span>
        </div>
        <p style="color:#999;font-size:12px;">This code expires in 5 minutes. If you did not request this, please ignore this email.</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [to],
        subject: "Your DWC 30th Verification Code",
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[OTP] Resend error:", err);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[OTP] DEV FALLBACK — Resend failed but dev mode. Code:", code, "for", to);
        return true;
      }
      return false;
    }
    console.log("[OTP] Email sent to", to);
    return true;
  } catch (err) {
    console.error("[OTP] Email send failed:", err);
    if (process.env.NODE_ENV !== "production") {
      console.warn("[OTP] DEV FALLBACK — Email send failed but dev mode. Code:", code, "for", to);
      return true;
    }
    return false;
  }
}
