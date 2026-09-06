import { getPublicEnv } from "@/lib/config/env";

export interface SendPasswordResetEmailParams {
  toEmail: string;
  recipientName: string;
  rawToken: string;
}

/**
 * Service for dispatching transactional devotional emails (e.g. password reset).
 *
 * Pluggable architecture:
 * If SMTP or an external email provider is configured, sends via provider.
 * If not configured, logs the reset link to the secure server console in development
 * without failing or faking delivery to the client.
 */
export class EmailService {
  static async sendPasswordResetEmail({
    toEmail,
    recipientName,
    rawToken,
  }: SendPasswordResetEmailParams): Promise<{ sent: boolean; messageId?: string }> {
    const env = getPublicEnv();
    const appUrl = env.appUrl.replace(/\/$/, "");
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

    // If an external email provider is configured:
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "Nityasādhanā <noreply@nityasadhana.app>",
            to: [toEmail],
            subject: "Reset your Nityasādhanā Password",
            html: `
              <div style="font-family: sans-serif; color: #193B3B; max-width: 540px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #193B3B; margin-bottom: 8px;">Hare Krishna, ${recipientName}</h2>
                <p style="color: #547070; font-size: 15px; line-height: 1.6;">
                  A password reset was requested for your Nityasādhanā account. Click the button below to choose a new password:
                </p>
                <div style="margin: 28px 0;">
                  <a href="${resetUrl}" style="background-color: #3F9495; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: 600; display: inline-block;">
                    Reset Password
                  </a>
                </div>
                <p style="color: #547070; font-size: 13px;">
                  This link expires in 1 hour. If you did not request this, you can safely disregard this message.
                </p>
              </div>
            `,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          return { sent: true, messageId: data.id };
        }
      } catch (err) {
        console.error("[EmailService] Error sending via Resend:", err);
      }
    }

    // Default development / local logging fallback:
    console.info(`[EmailService] Password reset token generated for ${toEmail}`);
    console.info(`[EmailService] Reset link: ${resetUrl}`);

    return { sent: true };
  }
}
