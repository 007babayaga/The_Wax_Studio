// Keep in sync with the backend: OTPs are generated as 5 digits
// (crypto.randomInt(10000, 100000)) and validated with /^\d{5}$/.
const OTP_LENGTH = 5;
const OTP_REGEX = new RegExp(`^\\d{${OTP_LENGTH}}$`);

// Digits only, never longer than OTP_LENGTH, even when pasted or autofilled.
const sanitizeOtp = (value) =>
    String(value ?? "").replace(/\D/g, "").slice(0, OTP_LENGTH);

export { OTP_LENGTH, OTP_REGEX, sanitizeOtp };
