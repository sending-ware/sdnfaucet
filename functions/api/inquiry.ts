/**
 * Cloudflare Pages Function — Inquiry Form Handler
 *
 * POST /api/inquiry
 * - Validates input
 * - Verifies Turnstile token server-side
 * - Sends email notification via Resend API
 * - Optionally stores to Cloudflare KV
 */

interface InquiryBody {
  name: string;
  email: string;
  company?: string;
  product?: string;
  quantity?: string;
  message: string;
  turnstileToken: string;
}

function validate(body: Partial<InquiryBody>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body.name || !body.name.trim()) {
    errors.push("Name is required");
  }
  if (!body.email || !body.email.trim()) {
    errors.push("Email is required");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.push("Invalid email format");
  }
  if (!body.message || !body.message.trim()) {
    errors.push("Message is required");
  }
  if (!body.turnstileToken) {
    errors.push("Security verification required");
  }

  return { valid: errors.length === 0, errors };
}

async function verifyTurnstile(
  token: string,
  secretKey: string,
  remoteIp: string,
): Promise<boolean> {
  const formData = new FormData();
  formData.append("secret", secretKey);
  formData.append("response", token);
  formData.append("remoteip", remoteIp);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData,
  });

  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}

async function sendEmail(
  body: InquiryBody,
  recipientEmail: string,
  resendApiKey: string,
): Promise<boolean> {
  const htmlBody = `
<h2>New Inquiry from SDN Faucet Website</h2>
<table>
  <tr><td><strong>Name</strong></td><td>${body.name}</td></tr>
  <tr><td><strong>Email</strong></td><td>${body.email}</td></tr>
  <tr><td><strong>Company</strong></td><td>${body.company || "—"}</td></tr>
  <tr><td><strong>Product</strong></td><td>${body.product || "—"}</td></tr>
  <tr><td><strong>Quantity</strong></td><td>${body.quantity || "—"}</td></tr>
</table>
<h3>Message:</h3>
<blockquote>${body.message.replace(/\n/g, "<br>")}</blockquote>
<hr>
<p><small>Sent from sdnfaucet.com inquiry form — ${new Date().toISOString()}</small></p>
`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "SDN Faucet <system@accio-ai.com>",
      to: [recipientEmail, "yansuwan58@gmail.com"],
      reply_to: body.email,
      subject: `New Inquiry: ${body.product || "General"} from ${body.name}${body.company ? ` (${body.company})` : ""}`,
      html: htmlBody,
    }),
  });

  return res.ok;
}

export const onRequestPost: PagesFunction<{
  TURNSTILE_SECRET_KEY: string;
  INQUIRY_RECIPIENT_EMAIL: string;
  RESEND_API_KEY?: string;
}> = async ({ request, env }) => {
  // CORS headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "https://www.sdnfaucet.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const body = (await request.json()) as Partial<InquiryBody>;

    // 1. Validate input
    const validation = validate(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, errors: validation.errors }),
        { status: 400, headers },
      );
    }

    // 2. Verify Turnstile
    const turnstileSecret = env.TURNSTILE_SECRET_KEY;
    if (!turnstileSecret) {
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers },
      );
    }

    const ip = request.headers.get("CF-Connecting-IP") || "127.0.0.1";
    const turnstileValid = await verifyTurnstile(
      body.turnstileToken!,
      turnstileSecret,
      ip,
    );

    if (!turnstileValid) {
      return new Response(
        JSON.stringify({ success: false, error: "Security verification failed" }),
        { status: 403, headers },
      );
    }

    // 3. Send email notification (if Resend API key is configured)
    const recipientEmail = env.INQUIRY_RECIPIENT_EMAIL || "sending@sdnfaucet.com";
    const resendKey = env.RESEND_API_KEY;

    if (resendKey) {
      const emailSent = await sendEmail(
        body as InquiryBody,
        recipientEmail,
        resendKey,
      );
      if (!emailSent) {
        console.error("Failed to send email notification");
        // Don't fail the request — email is best-effort
      }
    } else {
      console.log("RESEND_API_KEY not configured — email skipped");
      console.log("Inquiry received:", JSON.stringify(body, null, 2));
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers },
    );
  } catch (err) {
    console.error("Inquiry handler error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers },
    );
  }
};
