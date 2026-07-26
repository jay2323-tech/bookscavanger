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

export function isFreeEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const domain = email.trim().toLowerCase().split("@")[1];
  return !!domain && FREE_EMAIL_DOMAINS.has(domain);
}
