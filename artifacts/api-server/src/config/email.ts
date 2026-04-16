import nodemailer from 'nodemailer';

// بيانات البريد الإلكتروني (ضعي بياناتك الحقيقية هنا)
const EMAIL_USER = 'sanaalareeqj@gmail.com';  // ✅ استبدلي ببريدك الإلكتروني الكامل
const EMAIL_PASS = 'eftsimbjwusskfdm';     // ✅ استبدلي بكلمة مرور التطبيق (16 حرفاً بدون مسافات)

// تكوين SMTP لـ Gmail
export const emailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',      // ✅ Gmail SMTP
  port: 587,                    // ✅ منفذ TLS
  secure: false,                // false لـ 587
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,  // للتجربة فقط
  },
});

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
    console.log(`✅ Email sent successfully to: ${toEmail}`);
    return info;
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    throw error;
  }
};