import nodemailer from 'nodemailer';

// Email credentials (replace with your actual credentials)
const EMAIL_USER = 'sanaalareeqj@gmail.com';  // ✅ Replace with your full email address
const EMAIL_PASS = 'eftsimbjwusskfdm';     // ✅ Replace with your app password (16 characters, no spaces)

// SMTP configuration for Gmail
export const emailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',      // ✅ Gmail SMTP
  port: 587,                    // ✅ TLS port
  secure: false,                // false for 587
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,  // For testing only
  },
});

/**
 * Sends a document signature invitation (to an external party)
 */
export const sendSignatureInvitation = async (
  toEmail: string,
  documentTitle: string,
  token: string,
  expiresAt: Date
) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const signatureLink = `${frontendUrl}/external-sign/${token}`;
  
  const mailOptions = {
    from: `"TrustDoc" <${EMAIL_USER}>`,
    to: toEmail,
    subject: `📄 دعوة لتوقيع مستند: ${documentTitle}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #2563eb;">📢 دعوة لتوقيع مستند إلكتروني</h2>
        <p>تمت دعوتك لتوقيع المستند التالي من خلال نظام <strong>TrustDoc</strong>:</p>
        <div style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; margin: 10px 0;">
          <p><strong>📄 المستند:</strong> ${documentTitle}</p>
          <p><strong>⏰ صلاحية الرابط:</strong> ${expiresAt.toLocaleString('ar-EG')}</p>
        </div>
        <p>للتوقيع، يرجى الضغط على الرابط أدناه:</p>
        <p style="text-align: center;">
          <a href="${signatureLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            ✍️ توقيع المستند الآن
          </a>
        </p>
        <p>⚠️ هذا الرابط صالح لمدة 7 أيام فقط ولا يمكن استخدامه أكثر من مرة.</p>
        <hr />
        <p style="color: #666; font-size: 12px;">هذا بريد إلكتروني آمن من نظام TrustDoc للتوقيع الرقمي. يرجى عدم مشاركة هذا الرابط مع أي شخص.</p>
      </div>
    `,
  };
  
  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Signature invitation email sent successfully to: ${toEmail}`);
    return info;
  } catch (error) {
    console.error("❌ Failed to send signature invitation email:", error);
    throw error;
  }
};

/**
 * Sends a password reset verification code
 */
export const sendResetCode = async (
  toEmail: string,
  resetCode: string,
  userName: string
) => {
  console.log(`Attempting to send reset code to: ${toEmail}`);
  const mailOptions = {
    from: `"TrustDoc" <${EMAIL_USER}>`,
    to: toEmail,
    subject: `TrustDoc: رمز التحقق لاستعادة كلمة المرور`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #2563eb;">🔐 استعادة كلمة المرور لحسابك في TrustDoc</h2>
        <p>مرحباً <strong>${userName}</strong>،</p>
        <p>لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في نظام <strong>TrustDoc</strong>.</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
          <p style="font-size: 14px; color: #666; margin-bottom: 10px;">رمز التحقق الخاص بك هو:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; background-color: #fff; padding: 15px; border-radius: 8px; font-family: monospace; direction: ltr;">
            ${resetCode}
          </div>
        </div>
        <p>⚠️ هذا الرمز صالح لمدة <strong>10 دقائق</strong> فقط.</p>
        <p>إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد. لن يتم تغيير كلمة المرور الخاصة بك.</p>
        <hr />
        <p style="color: #666; font-size: 12px;">هذا بريد إلكتروني آمن من نظام TrustDoc. يرجى عدم مشاركة هذا الرمز مع أي شخص.</p>
      </div>
    `,
  };
  
  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Reset code email sent successfully to: ${toEmail}`);
    console.log(`Message ID: ${info.messageId}`);
    console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`); // Useful for debugging with Ethereal
    return info;
  } catch (error: any) {
    console.error("❌ Failed to send reset code email:", error);
    // Log more details about the error
    if (error.response) {
      console.error("Error Response:", error.response);
    }
    if (error.responseCode) {
      console.error("Error Response Code:", error.responseCode);
    }
    if (error.command) {
      console.error("Error Command:", error.command);
    }
    throw error;
  }
};