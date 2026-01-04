const nodemailer = require("nodemailer");

//Create Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
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
            from: `"The Wax Studio" <${process.env.SMTP_USER}>`,
            to: toEmail,
            subject: subject,
            html: htmlText,
        });
        console.log("--------------Message sent✅----------");
    } catch (err) {
        console.log("--------------Error while sending mail❌", err.message);
        throw new Error("Email not Sent!!")
    }
};

const sendOtp = async(toEmail, otp) => {
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
        <body style="margin:0; padding:0; background-color:#fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fafafa; padding:40px 16px;">
                <tr>
                    <td align="center">
                        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border-radius:8px; border:1px solid #e5e5e5; max-width:560px; width:100%;">
                            
                            <!-- Header -->
                            <tr>
                                <td class="padding" style="padding:40px 40px 32px; text-align:center; border-bottom:1px solid #f0f0f0;">
                                    <div style="font-size:28px; margin-bottom:8px;">🕯️</div>
                                    <h1 class="brand-name" style="margin:0; color:#1a1a1a; font-size:22px; font-weight:500; letter-spacing:1px;">
                                        THE WAX STUDIO
                                    </h1>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td class="padding" style="padding:40px;">
                                    <h2 style="margin:0 0 16px; color:#1a1a1a; font-size:18px; font-weight:600;">
                                        Verify your account
                                    </h2>
                                    
                                    <p style="margin:0 0 32px; font-size:14px; color:#525252; line-height:1.5;">
                                        Enter this verification code to complete your registration:
                                    </p>
                                    
                                    <!-- OTP -->
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                            <td align="center" style="padding:0 0 32px;">
                                                <div style="background-color:#f8f8f8; border:1px solid #e0e0e0; border-radius:6px; padding:20px; display:inline-block;">
                                                    <div class="otp-code" style="font-size:32px; font-weight:600; letter-spacing:8px; color:#1a1a1a; font-family: 'Courier New', monospace;">
                                                        ${otp}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <!-- Info -->
                                    <div style="background-color:#f9f9f9; border-left:3px solid #1a1a1a; padding:16px; border-radius:4px;">
                                        <p style="margin:0; font-size:13px; color:#525252; line-height:1.6;">
                                            • Code expires in 5 minutes<br/>
                                            • Keep this code confidential<br/>
                                            • Didn't request this? Ignore this email
                                        </p>
                                    </div>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td class="padding" style="padding:32px 40px; background-color:#fafafa; border-top:1px solid #f0f0f0; text-align:center;">
                                    <p style="margin:0 0 12px; font-size:13px; color:#525252;">
                                        Questions? <a href="tel:+919719534452" style="color:#1a1a1a; text-decoration:none; font-weight:500;">+91 97195 34452</a>
                                    </p>
                                    <p style="margin:0; font-size:12px; color:#a3a3a3;">
                                        The Wax Studio · Handcrafted Candles<br/>
                                        © ${new Date().getFullYear()}
                                    </p>
                                </td>
                            </tr>
                        </table>
                        
                        <!-- Disclaimer -->
                        <p style="margin:24px 0 0; font-size:11px; color:#a3a3a3; text-align:center;">
                            This is an automated message, please do not reply.
                        </p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `
    );
};

module.exports = { sendOtp };

module.exports = { sendOtp };

