import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the SMTP transporter using environment variables
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    family: 4, // Force IPv4 to resolve ENETUNREACH issues on cloud hosts like Render
    auth: {
        user: process.env.SMTP_USER, // Your Gmail address
        pass: process.env.SMTP_PASS  // Your Gmail App Password
    }
});

/**
 * Sends a stylized HTML email with the 6-digit OTP code to the user.
 * Falls back safely to terminal logging if SMTP credentials are missing.
 */
export async function sendOtpEmail(toEmail, userName, otpCode) {
    // Check if credentials are set. If not, log to console as fallback.
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`\n======================================================`);
        console.log(`[MOCK MAIL SENDER] To: ${toEmail} (${userName})`);
        console.log(`[OTP CODE]: ${otpCode}`);
        console.log(`[NOTICE]: Add SMTP_USER and SMTP_PASS to send real emails.`);
        console.log(`======================================================\n`);
        return { success: true, mocked: true };
    }

    const htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #e8e8e8; border-radius: 20px; background-color: #ffffff; color: #333333;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #059669; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">AgriMarket</h1>
                <p style="color: #6b7280; font-size: 12px; margin-top: 5px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Agricultural Marketplace</p>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #f3f4f6; margin-bottom: 25px;">
            
            <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">Muraho <strong>${userName}</strong>,</p>
            <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">Mwasabye guhindura ijambo ry'ibanga rya konti yanyu. Nyamuneka koresha uyu mubare w'ibanga w'agateganyo (OTP code) ugenewe imiziririzo yawe:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <span style="display: inline-block; background-color: #f0fdf4; border: 2px dashed #10b981; border-radius: 15px; padding: 12px 30px; font-size: 28px; font-weight: 900; letter-spacing: 8px; color: #065f46; font-family: monospace;">${otpCode}</span>
                <p style="color: #9ca3af; font-size: 11px; margin-top: 10px;">Iri jambo ry'agateganyo rirangiza igihe mu minota 5 (Expires in 5 minutes)</p>
            </div>
            
            <p style="font-size: 13px; line-height: 1.5; color: #6b7280;">Niba atari mwe mwasabye iri hinduka, nyamuneka mwirengagize iyi baruwa, konti yanyu iracyari mu mutekano.</p>
            
            <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 25px 0;">
            
            <div style="text-align: center; color: #9ca3af; font-size: 11px; line-height: 1.4;">
                <p style="margin: 0; font-weight: bold; color: #6b7280;">AgriMarket Platform Team</p>
                <p style="margin: 3px 0 0 0;">Kigali, Rwanda</p>
            </div>
        </div>
    `;

    const mailOptions = {
        from: `"AgriMarket Security" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `[AgriMarket] OTP Code: ${otpCode} - Hindura Ijambo ry'ibanga`,
        html: htmlContent
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SENT] OTP successfully delivered to ${toEmail}. MessageId: ${info.messageId}`);
        return { success: true, mocked: false, messageId: info.messageId };
    } catch (error) {
        console.error(`[EMAIL ERROR] Failed to send OTP email to ${toEmail}:`, error);
        throw error;
    }
}
