import { Resend } from "resend";

let client = null;

function getClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

function fromAddress() {
  return (
    process.env.EMAIL_FROM || "BookScavenger <onboarding@resend.dev>"
  );
}

export function appUrl() {
  return (process.env.APP_URL || "https://bookscavanger.vercel.app").replace(
    /\/$/,
    ""
  );
}

/**
 * Send email via Resend. Safe no-op when RESEND_API_KEY is unset.
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!to || !subject) {
    return { skipped: true, reason: "missing to/subject" };
  }

  const resend = getClient();
  if (!resend) {
    console.log(`[email skip] ${subject} → ${to}`);
    return { skipped: true, reason: "RESEND_API_KEY unset" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress(),
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || `<p>${text || subject}</p>`,
      text: text || subject,
    });
    if (error) {
      console.error("[email error]", error);
      return { ok: false, error };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error("[email throw]", err.message);
    return { ok: false, error: err };
  }
}

/**
 * Email librarian a join link after admin approval.
 */
export async function sendLibraryJoinEmail({ to, libraryName }) {
  const joinUrl = `${appUrl()}/library/login?next=${encodeURIComponent(
    "/library/dashboard/overview"
  )}`;
  const name = libraryName || "your library";
  const subject = `${name} is approved on BookScavenger`;
  const text = `Good news — ${name} is verified and ready to join BookScavenger.\n\nSign in to open your librarian desk:\n${joinUrl}\n\nIf you didn't apply, you can ignore this email.`;
  const html = `
    <p>Good news — <strong>${escapeHtml(name)}</strong> is verified and ready to join BookScavenger.</p>
    <p><a href="${joinUrl}">Open your librarian desk</a></p>
    <p style="color:#666;font-size:13px;">If you didn't apply, you can ignore this email.</p>
  `;
  return sendEmail({ to, subject, html, text });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
