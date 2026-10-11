const { Resend } = require("resend");

const OTP_TTL_MINUTES = 5; // keep in sync with OTP_TTL_MS in the controller
const SUPPORT_PHONE = process.env.SUPPORT_PHONE || "+91 97195 34452";
const EMAIL_REGEX = /^[a-z]+[0-9]*@gmail\.com$/;
const OTP_REGEX = /^\d{5}$/;
const SEND_TIMEOUT_MS = 15000;

let client = null;

const getClient = () => {
  if (client) return client;

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }

  client = new Resend(process.env.RESEND_API_KEY);
  return client;
};

// Call once at startup, AFTER dotenv has loaded. Never crashes the app.
// Resend has no connection handshake, so this only checks configuration.
// A real send is the true test.
const verifyEmailConnection = async () => {
  try {
    getClient();
    if (!process.env.EMAIL_FROM) {
      throw new Error("EMAIL_FROM is not set");
    }
    console.log("Email service configured");
    return true;
  } catch (err) {
    console.error("Email service config error:", err.message);
    return false;
  }
};

const maskEmail = (email) => {
  const [local = "", domain = ""] = String(email).split("@");
  return `${local.slice(0, 2)}***@${domain}`;
};

const withTimeout = (promise, ms) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Email request timed out after ${ms}ms`)),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

const sendEmail = async ({ to, subject, html, text }) => {
  const from = process.env.ONBOARDING_EMAIL_FROM;
  if (!from) {
    throw new Error("EMAIL_FROM is not set");
  }

  try {
    const { data, error } = await withTimeout(
      getClient().emails.send({ from, to: [to], subject, html, text }),
      SEND_TIMEOUT_MS
    );

    // The Resend SDK returns errors instead of throwing them
    if (error) {
      throw new Error(`${error.name || "ResendError"}: ${error.message}`);
    }

    console.log(`Email sent to ${maskEmail(to)} (id: ${data?.id})`);
    return data;
  } catch (err) {
    console.error(`Email to ${maskEmail(to)} failed:`, err.message);
    throw new Error("Email not sent", { cause: err });
  }
};

const buildOtpText = (otp) =>
  `Your The Wax Studio verification code is ${otp}.\n\n` +
  `It expires in ${OTP_TTL_MINUTES} minutes. Keep this code confidential.\n` +
  `If you didn't request this, you can ignore this email.\n\n` +
  `Need help? Call ${SUPPORT_PHONE}.`;

const buildOtpHtml = (otp) => {
  const telHref = SUPPORT_PHONE.replace(/[^\d+]/g, "");

  return `
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
      <title>Verify Account - The Wax Studio</title>
      <style type="text/css">
        @media only screen and (max-width: 600px) {
          .container { width: 100% !important; }
          .padding { padding: 24px !important; }
          .otp-code { font-size: 28px !important; letter-spacing: 6px !important; }
          .brand-name { font-size: 20px !important; }
        }
      </style>
    </head>
    <body style="margin:0; padding:0; background-color:#fdfdfd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fdfdfd; padding:40px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border-radius:12px; border:1px solid #ececec; max-width:560px; width:100%; box-shadow:0 4px 12px rgba(0,0,0,0.05);">

              <!-- Header -->
              <tr>
                <td class="padding" style="padding:32px; text-align:center; border-bottom:1px solid #f0f0f0;">
                  <div style="font-size:32px; margin-bottom:8px;">🕯️</div>
                  <h1 class="brand-name" style="margin:0; color:#2c2c2c; font-size:24px; font-weight:600; letter-spacing:1px;">
                    THE WAX STUDIO
                  </h1>
                  <p style="margin:8px 0 0; font-size:13px; color:#777;">Handcrafted Candles · Since 2026</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td class="padding" style="padding:40px;">
                  <h2 style="margin:0 0 16px; color:#2c2c2c; font-size:18px; font-weight:600;">
                    Welcome, verify your account
                  </h2>

                  <p style="margin:0 0 32px; font-size:14px; color:#555; line-height:1.6;">
                    Thank you for joining The Wax Studio family. Use the code below to complete your registration:
                  </p>

                  <!-- OTP -->
                  <div style="text-align:center; margin-bottom:32px;">
                    <div style="background-color:#fff8f0; border:1px solid #e0c097; border-radius:8px; padding:24px; display:inline-block; box-shadow:0 2px 6px rgba(0,0,0,0.05);">
                      <div class="otp-code" style="font-size:36px; font-weight:700; letter-spacing:10px; color:#4a2c2a; font-family:'Courier New', monospace;">
                        ${otp}
                      </div>
                    </div>
                  </div>

                  <!-- Info -->
                  <div style="background-color:#f9f9f9; border-left:3px solid #4a2c2a; padding:16px; border-radius:4px;">
                    <p style="margin:0; font-size:13px; color:#555; line-height:1.6;">
                      • Code expires in ${OTP_TTL_MINUTES} minutes<br/>
                      • Keep this code confidential<br/>
                      • If you didn’t request this, simply ignore this email
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td class="padding" style="padding:24px; background-color:#fafafa; border-top:1px solid #f0f0f0; text-align:center;">
                  <p style="margin:0 0 12px; font-size:13px; color:#555;">
                    Need help? Call us at <a href="tel:${telHref}" style="color:#2c2c2c; text-decoration:none; font-weight:500;">${SUPPORT_PHONE}</a>
                  </p>
                  <p style="margin:0; font-size:12px; color:#999;">
                    The Wax Studio · Delhi, India<br/>
                    © ${new Date().getFullYear()} All rights reserved
                  </p>
                </td>
              </tr>
            </table>

            <!-- Disclaimer -->
            <p style="margin:24px 0 0; font-size:11px; color:#aaa; text-align:center;">
              This is an automated message. Please do not reply.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

const sendOtp = async (toEmail, otp) => {
  const otpString = String(otp);

  if (typeof toEmail !== "string" || !EMAIL_REGEX.test(toEmail)) {
    throw new Error("Invalid recipient email");
  }
  if (!OTP_REGEX.test(otpString)) {
    throw new Error("Invalid OTP format");
  }

  await sendEmail({
    to: toEmail,
    subject: "Verify Your Account - The Wax Studio",
    html: buildOtpHtml(otpString),
    text: buildOtpText(otpString),
  });
};

module.exports = { sendOtp, verifyEmailConnection };