// Maps a 10-digit phone number to a synthetic email used for Supabase password auth.
// This lets us use Supabase email/password auth as the storage mechanism for
// phone+password credentials, without requiring SMS/OTP.
export const PHONE_EMAIL_DOMAIN = "aerospawn.local";

export function phoneToEmail(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@${PHONE_EMAIL_DOMAIN}`;
}

export function isValidPhone(phone: string): boolean {
  return /^\d{10}$/.test(phone.replace(/\D/g, ""));
}
