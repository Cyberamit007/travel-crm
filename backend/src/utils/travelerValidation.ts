const PHONE_PATTERN = /^[6-9]\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Shared between the public Traveler Portal (travelerPortal.controller.ts,
// where this is the only defense since the caller isn't authenticated) and
// the Ops-authenticated traveler endpoints (departure.controller.ts, as a
// data-quality guard against typos — a future DOB or malformed phone number
// breaks age calculations and outreach elsewhere in the app either way).
export function validateTravelerInput(b: Record<string, unknown>): string | null {
  if (b.name !== undefined) {
    const name = String(b.name).trim();
    if (name.length < 2) return 'Name must be at least 2 characters';
    if (name.length > 100) return 'Name is too long';
  }
  if (b.mobile && !PHONE_PATTERN.test(String(b.mobile).trim())) return 'Enter a valid 10-digit mobile number';
  if (b.email && !EMAIL_PATTERN.test(String(b.email).trim())) return 'Enter a valid email address';
  if (b.emergencyContactPhone && !PHONE_PATTERN.test(String(b.emergencyContactPhone).trim())) return 'Enter a valid 10-digit emergency contact number';
  if (b.dob) {
    const d = new Date(String(b.dob));
    if (isNaN(d.getTime())) return 'Enter a valid date of birth';
    if (d > new Date()) return 'Date of birth cannot be in the future';
    if (new Date().getFullYear() - d.getFullYear() > 120) return 'Enter a valid date of birth';
  }
  if (b.govIdNumber && b.govIdType === 'AADHAR' && !/^\d{12}$/.test(String(b.govIdNumber).replace(/\s/g, ''))) {
    return 'Aadhar number must be 12 digits';
  }
  return null;
}
