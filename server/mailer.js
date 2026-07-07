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

const fromEmail = process.env.SMTP_FROM || 'urayenezajeand@gmail.com';

/**
 * Sends a stylized HTML email with the 6-digit OTP code to the user.
 * Falls back safely to terminal logging if SMTP credentials are missing.
 */
export async function sendOtpEmail(toEmail, userName, otpCode) {
    const htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #e8e8e8; border-radius: 20px; background-color: #ffffff; color: #333333;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #059669; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">AgriMarket</h1>
                <p style="color: #6b7280; font-size: 12px; margin-top: 5px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Agricultural Marketplace</p>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #f3f4f6; margin-bottom: 25px;">
            
            <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">Hello <strong>${userName}</strong>,</p>
            <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">Please use the following One-Time Password (OTP) verification code to log in to your account:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <span style="display: inline-block; background-color: #f0fdf4; border: 2px dashed #10b981; border-radius: 15px; padding: 12px 30px; font-size: 28px; font-weight: 900; letter-spacing: 8px; color: #065f46; font-family: monospace;">${otpCode}</span>
                <p style="color: #9ca3af; font-size: 11px; margin-top: 10px;">This code is valid for 5 minutes.</p>
            </div>
            
            <p style="font-size: 13px; line-height: 1.5; color: #6b7280;">If you did not request this code, please ignore this email. Your account security is safe.</p>
            
            <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 25px 0;">
            
            <div style="text-align: center; color: #9ca3af; font-size: 11px; line-height: 1.4;">
                <p style="margin: 0; font-weight: bold; color: #6b7280;">AgriMarket Platform Team</p>
                <p style="margin: 3px 0 0 0;">Kigali, Rwanda</p>
            </div>
        </div>
    `;

    // 1. Check if Brevo HTTP API is configured
    if (process.env.BREVO_API_KEY) {
        try {
            console.log(`[BREVO API] Attempting to send email via Brevo HTTP API to ${toEmail}...`);
            const senderEmail = fromEmail;
            
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': process.env.BREVO_API_KEY,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    sender: { name: 'AgriMarket Security', email: senderEmail },
                    to: [{ email: toEmail, name: userName }],
                    subject: `Login Verification OTP: ${otpCode}`,
                    htmlContent: htmlContent
                })
            });

            const data = await response.json();
            if (response.ok) {
                console.log(`[BREVO SUCCESS] Email sent to ${toEmail}. Message ID: ${data.messageId}`);
                return { success: true, mocked: false, messageId: data.messageId };
            } else {
                throw new Error(data.message || 'Brevo API returned an error');
            }
        } catch (error) {
            console.error('[BREVO ERROR] Failed to send email via Brevo API:', error);
            // Fall back to SMTP check if Brevo fails
        }
    }

    // 2. Fall back to SMTP check
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`\n======================================================`);
        console.log(`[MOCK MAIL SENDER] To: ${toEmail} (${userName})`);
        console.log(`[OTP CODE]: ${otpCode}`);
        console.log(`[NOTICE]: Add BREVO_API_KEY or SMTP credentials to send real emails.`);
        console.log(`======================================================\n`);
        return { success: true, mocked: true };
    }

    const mailOptions = {
        from: `"AgriMarket Security" <${fromEmail}>`,
        to: toEmail,
        subject: `Login Verification OTP: ${otpCode}`,
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

export async function sendOrderReceiptEmail(toEmail, userName, orderId, totalAmount, address, phone, items) {
    const itemsHtml = items.map(item => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; font-size: 14px; font-weight: 600; color: #374151;">${item.name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #4b5563; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #4b5563; text-align: right;">${Number(item.price).toLocaleString()} RWF</td>
            <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; font-size: 14px; font-weight: 700; color: #111827; text-align: right;">${(Number(item.price) * item.quantity).toLocaleString()} RWF</td>
        </tr>
    `).join('');

    const grandTotal = totalAmount + 1000; // Including standard delivery fee

    const htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e8e8e8; border-radius: 24px; background-color: #ffffff; color: #333333;">
            <div style="text-align: center; margin-bottom: 25px;">
                <h1 style="color: #059669; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">AgriMarket</h1>
                <p style="color: #6b7280; font-size: 11px; margin-top: 5px; text-transform: uppercase; font-weight: bold; letter-spacing: 1.5px;">Order Receipt & Confirmation</p>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #f3f4f6; margin-bottom: 25px;">
            
            <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">Thank you for shopping at AgriMarket, <strong>${userName}</strong>!</p>
            <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin-bottom: 20px;">We have received your order. Here is your receipt containing purchase details:</p>
            
            <div style="background-color: #f9fafb; border-radius: 16px; padding: 20px; margin-bottom: 25px; border: 1px solid #f3f4f6;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #4b5563;"><strong>Order Number:</strong> #${orderId}</p>
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #4b5563;"><strong>Delivery Address:</strong> ${address}</p>
                <p style="margin: 0; font-size: 13px; color: #4b5563;"><strong>Contact Phone:</strong> ${phone}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                <thead>
                    <tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                        <th style="padding: 12px 10px; font-size: 11px; text-transform: uppercase; color: #6b7280; text-align: left; font-weight: bold;">Crop / Item</th>
                        <th style="padding: 12px 10px; font-size: 11px; text-transform: uppercase; color: #6b7280; text-align: center; font-weight: bold;">Qty</th>
                        <th style="padding: 12px 10px; font-size: 11px; text-transform: uppercase; color: #6b7280; text-align: right; font-weight: bold;">Unit Price</th>
                        <th style="padding: 12px 10px; font-size: 11px; text-transform: uppercase; color: #6b7280; text-align: right; font-weight: bold;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            
            <div style="width: 250px; margin-left: auto; margin-bottom: 30px;">
                <div style="display: flex; justify-content: space-between; font-size: 13px; color: #6b7280; margin-bottom: 8px;">
                    <span>Items Subtotal:</span>
                    <span style="font-weight: 600;">${totalAmount.toLocaleString()} RWF</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 13px; color: #6b7280; margin-bottom: 8px;">
                    <span>Standard Shipping:</span>
                    <span style="font-weight: 600;">1,000 RWF</span>
                </div>
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 8px 0;">
                <div style="display: flex; justify-content: space-between; font-size: 15px; color: #111827; font-weight: bold;">
                    <span>Grand Total:</span>
                    <span style="color: #059669;">${grandTotal.toLocaleString()} RWF</span>
                </div>
            </div>
            
            <p style="font-size: 13px; line-height: 1.5; color: #6b7280; text-align: center;">The seller will process and ship your items shortly.</p>
            
            <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 25px 0;">
            
            <div style="text-align: center; color: #9ca3af; font-size: 11px; line-height: 1.4;">
                <p style="margin: 0; font-weight: bold; color: #6b7280;">AgriMarket Platform Team</p>
                <p style="margin: 3px 0 0 0;">Kigali, Rwanda</p>
            </div>
        </div>
    `;

    // 1. Check if Brevo HTTP API is configured
    if (process.env.BREVO_API_KEY) {
        try {
            console.log(`[BREVO API] Attempting to send order receipt email to ${toEmail}...`);
            const senderEmail = fromEmail;
            
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': process.env.BREVO_API_KEY,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    sender: { name: 'AgriMarket Orders', email: senderEmail },
                    to: [{ email: toEmail, name: userName }],
                    subject: `Receipt: Order #${orderId} Confirmed`,
                    htmlContent: htmlContent
                })
            });

            const data = await response.json();
            if (response.ok) {
                console.log(`[BREVO SUCCESS] Order receipt email sent to ${toEmail}. Message ID: ${data.messageId}`);
                return { success: true, mocked: false, messageId: data.messageId };
            } else {
                throw new Error(data.message || 'Brevo API returned an error');
            }
        } catch (error) {
            console.error('[BREVO ERROR] Failed to send order receipt email via Brevo API:', error);
        }
    }

    // 2. Fall back to SMTP check
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`\n======================================================`);
        console.log(`[MOCK ORDER RECEIPT SENDER] To: ${toEmail} (${userName})`);
        console.log(`[ORDER ID]: #${orderId}`);
        console.log(`[TOTAL AMOUNT]: ${grandTotal} RWF`);
        console.log(`[DELIVERY ADDRESS]: ${address}`);
        console.log(`[NOTICE]: Add BREVO_API_KEY or SMTP credentials to send real emails.`);
        console.log(`======================================================\n`);
        return { success: true, mocked: true };
    }

    const mailOptions = {
        from: `"AgriMarket Orders" <${fromEmail}>`,
        to: toEmail,
        subject: `Receipt: Order #${orderId} Confirmed`,
        html: htmlContent
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SENT] Order receipt successfully delivered to ${toEmail}. MessageId: ${info.messageId}`);
        return { success: true, mocked: false, messageId: info.messageId };
    } catch (error) {
        console.error(`[EMAIL ERROR] Failed to send order receipt email to ${toEmail}:`, error);
        throw error;
    }
}
