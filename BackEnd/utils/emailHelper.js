const nodemailer = require("nodemailer");

//Create Transporter // Check resend.com for Key
const transporter = nodemailer.createTransport({
    host: "smtp.resend.com",
    port: 465,
    secure: true,
    auth: {
        user: "resend",
        pass: process.env.RESEND_API_KEY, // put your Resend API key in .env
    },
});

// verify the Connection
(async () => {
    try {
        await transporter.verify();
        console.log("-----------Email Server is ready ✅------");
    } catch (err) {
        console.error("------Email Server Error❌---", err.message);
    }
})();

const sendemail = async (toEmail, subject, htmlText) => {
    try {
        await transporter.sendMail({
            from: `onboarding@resend.dev`,
            to: toEmail,
            subject: subject,
            html: htmlText,
        });
        console.log("--------------Message sent✅----------");
    } catch (err) {
        console.log("--------------Error while sending mail❌", err.message);
        throw new Error("Email not Sent!!");
    }
};

const sendOtp = async (toEmail, otp) => {
  console.log("sending email to..", toEmail);

  await sendemail(
    toEmail,
    "Verify Your Account - The Wax Studio",
    `
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
                    <div style="
                      background-color:#fff8f0;
                      border:1px solid #e0c097;
                      border-radius:8px;
                      padding:24px;
                      display:inline-block;
                      box-shadow:0 2px 6px rgba(0,0,0,0.05);
                    ">
                      <div class="otp-code" style="
                        font-size:36px;
                        font-weight:700;
                        letter-spacing:10px;
                        color:#4a2c2a;
                        font-family:'Courier New', monospace;
                      ">
                        ${otp}
                      </div>
                    </div>
                  </div>
                  
                  <!-- Info -->
                  <div style="background-color:#f9f9f9; border-left:3px solid #4a2c2a; padding:16px; border-radius:4px;">
                    <p style="margin:0; font-size:13px; color:#555; line-height:1.6;">
                      • Code expires in 5 minutes<br/>
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
                    Need help? Call us at <a href="tel:+919719534452" style="color:#2c2c2c; text-decoration:none; font-weight:500;">+91 97195 34452</a>
                  </p>
                  <p style="margin:0; font-size:12px; color:#999;">
                    The Wax Studio · Mysore, India<br/>
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
    `,
  );
};


module.exports = { sendOtp };
