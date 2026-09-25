export type VerificationEmailInput = {
  email: string;
  fullName?: string | null;
  token: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getConfig() {
  const provider = (process.env.EMAIL_PROVIDER || 'resend').trim().toLowerCase();
  const apiKey = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

  if (!apiKey || !from) {
    throw new Error('EMAIL_NOT_CONFIGURED');
  }

  return { provider, apiKey, from, appUrl };
}

/**
 * Application-owned email boundary.
 *
 * The rest of the application only calls this function. The current
 * transport is Resend HTTP API. The transport can later be replaced by
 * SMTP or another server-side provider without changing auth or UI code.
 */
export async function sendCustomerVerificationEmail({
  email,
  fullName,
  token,
}: VerificationEmailInput) {
  const { provider, apiKey, from, appUrl } = getConfig();

  if (provider !== 'resend') {
    throw new Error('EMAIL_PROVIDER_UNSUPPORTED');
  }

  const safeName = escapeHtml(fullName?.trim() || 'there');
  const verificationUrl = `${appUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Verify your Destino Travels email',
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;color:#17202a">
        <h2 style="margin-bottom:16px">Verify your Destino Travels account</h2>
        <p>Hello ${safeName},</p>
        <p>Please verify your email address to activate your customer account.</p>
        <p style="margin:28px 0">
          <a href="${verificationUrl}" style="display:inline-block;padding:12px 20px;background:#cda631;color:#fff;text-decoration:none;border-radius:6px">Verify Email</a>
        </p>
        <p>This verification link expires in 24 hours.</p>
        <p>If you did not create this account, you can safely ignore this email.</p>
      </div>`,
    }),
  });

  if (!response.ok) {
    const providerError = await response.text().catch(() => '');
    console.error('Verification email provider error:', providerError);
    throw new Error('EMAIL_SEND_FAILED');
  }
}
