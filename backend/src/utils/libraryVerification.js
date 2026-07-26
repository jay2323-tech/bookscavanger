const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.in",
  "ymail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "mail.com",
  "gmx.com",
  "gmx.net",
  "zoho.com",
]);

export function isFreeEmail(email) {
  if (!email || typeof email !== "string") return false;
  const domain = email.trim().toLowerCase().split("@")[1];
  return !!domain && FREE_EMAIL_DOMAINS.has(domain);
}

/** Normalize and validate http(s) website URL. Returns { ok, url, error }. */
export function normalizeWebsite(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) {
    return { ok: false, error: "Website is required" };
  }
  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { ok: false, error: "Website must be an http(s) URL" };
    }
    if (!u.hostname || !u.hostname.includes(".")) {
      return { ok: false, error: "Enter a valid website URL" };
    }
    return { ok: true, url: u.toString() };
  } catch {
    return { ok: false, error: "Enter a valid website URL" };
  }
}

export function normalizePhone(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) {
    return { ok: false, error: "Phone number is required" };
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return { ok: false, error: "Enter a valid phone number" };
  }
  return { ok: true, phone: trimmed.slice(0, 40) };
}
