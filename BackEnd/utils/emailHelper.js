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
        "Verify Your Email - The Wax Studio",
        `
        <!doctype html>
        <html lang="en">
        <head>
            <meta charset="utf-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <title>Email Verification - The Wax Studio</title>
        </head>
        <body style="margin:0; padding:0; background-color:#f8f5f2; font-family: 'Helvetica Neue', Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f5f2; padding:40px 20px;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
                            
                            <!-- Header Section -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #8b7355 0%, #6b5b4a 100%); padding:50px 40px; text-align:center;">
                                    <div style="background-color:rgba(255,255,255,0.15); border-radius:50%; width:80px; height:80px; margin:0 auto 20px; display:flex; align-items:center; justify-content:center;">
                                        <span style="font-size:40px;">🕯️</span>
                                    </div>
                                    <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:400; letter-spacing:4px; text-transform:uppercase;">
                                        The Wax Studio
                                    </h1>
                                    <p style="margin:12px 0 0 0; color:#f5e6d3; font-size:13px; letter-spacing:2px; text-transform:uppercase;">
                                        Artisan Candles
                                    </p>
                                </td>
                            </tr>
                            
                            <!-- Content Section -->
                            <tr>
                                <td style="padding:50px 40px;">
                                    <h2 style="margin:0 0 20px 0; color:#3d3226; font-size:22px; font-weight:600; text-align:center;">
                                        Verify Your Email Address
                                    </h2>
                                    <p style="margin:0 0 30px 0; font-size:15px; color:#5a4d3e; line-height:1.8; text-align:center;">
                                        Thank you for joining The Wax Studio. To complete your registration and start exploring our handcrafted candle collection, please verify your email address using the code below.
                                    </p>
                                    
                                    <!-- OTP Box -->
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td align="center" style="padding:20px 0 30px 0;">
                                                <table cellpadding="0" cellspacing="0" style="background-color:#faf8f5; border:2px solid #d4a574; border-radius:10px; padding:30px 50px;">
                                                    <tr>
                                                        <td align="center">
                                                            <p style="margin:0 0 12px 0; font-size:11px; color:#8b7355; text-transform:uppercase; letter-spacing:2px; font-weight:600;">
                                                                Verification Code
                                                            </p>
                                                            <div style="font-size:38px; font-weight:700; letter-spacing:10px; color:#6b5b4a; font-family: 'Courier New', Courier, monospace;">
                                                                ${otp}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <!-- Important Notice -->
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td style="background-color:#fff9f0; border-left:4px solid #d4a574; padding:20px 25px; border-radius:6px;">
                                                <p style="margin:0 0 12px 0; font-size:14px; color:#3d3226; font-weight:600;">
                                                    Important Information:
                                                </p>
                                                <p style="margin:0; font-size:13px; color:#5a4d3e; line-height:1.8;">
                                                    • This code expires in <strong>5 minutes</strong><br/>
                                                    • For security, do not share this code with anyone<br/>
                                                    • If you didn't request this verification, please disregard this email
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <!-- Call to Action -->
                                    <p style="margin:30px 0 0 0; font-size:14px; color:#5a4d3e; text-align:center; line-height:1.6;">
                                        Once verified, you'll have access to our exclusive collection of handcrafted candles, personalized design options, and special member offers.
                                    </p>
                                </td>
                            </tr>
                            
                            <!-- Footer Section -->
                            <tr>
                                <td style="background-color:#faf8f5; padding:40px; text-align:center; border-top:1px solid #e8dfd5;">
                                    <p style="margin:0 0 15px 0; font-size:15px; color:#6b5b4a; font-weight:500;">
                                        Why Choose The Wax Studio?
                                    </p>
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td width="33%" style="padding:10px; text-align:center;">
                                                <p style="margin:0; font-size:24px;">🎨</p>
                                                <p style="margin:8px 0 0 0; font-size:12px; color:#8b7355; line-height:1.5;">
                                                    <strong>Custom Designs</strong><br/>
                                                    Personalized for you
                                                </p>
                                            </td>
                                            <td width="33%" style="padding:10px; text-align:center;">
                                                <p style="margin:0; font-size:24px;">🌿</p>
                                                <p style="margin:8px 0 0 0; font-size:12px; color:#8b7355; line-height:1.5;">
                                                    <strong>Natural Ingredients</strong><br/>
                                                    Eco-friendly & sustainable
                                                </p>
                                            </td>
                                            <td width="33%" style="padding:10px; text-align:center;">
                                                <p style="margin:0; font-size:24px;">✨</p>
                                                <p style="margin:8px 0 0 0; font-size:12px; color:#8b7355; line-height:1.5;">
                                                    <strong>Premium Quality</strong><br/>
                                                    Handcrafted with care
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <!-- Divider -->
                                    <div style="margin:30px auto; width:60px; height:1px; background-color:#d4a574;"></div>
                                    
                                    <!-- Social & Legal -->
                                    <p style="margin:0 0 8px 0; font-size:12px; color:#8b7355;">
                                        Questions? Contact us at support@thewaxstudio.com
                                    </p>
                                    <p style="margin:0 0 20px 0; font-size:11px; color:#a89684; line-height:1.6;">
                                        The Wax Studio | Handcrafted Artisan Candles<br/>
                                        Creating ambiance, one candle at a time
                                    </p>
                                    <p style="margin:0; font-size:10px; color:#b5a594;">
                                        © ${new Date().getFullYear()} The Wax Studio. All rights reserved.
                                    </p>
                                </td>
                            </tr>
                            
                        </table>
                        
                        <!-- Email Footer Note -->
                        <p style="margin:20px 0 0 0; font-size:11px; color:#a89684; text-align:center; line-height:1.5;">
                            -------This is an automated message. Please do not reply to this email.--------
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