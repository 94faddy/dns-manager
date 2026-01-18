import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function sendVerificationEmail(email: string, token: string, name: string): Promise<void> {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;
  
  await transporter.sendMail({
    from: `"DNS Manager" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '🔐 ยืนยันอีเมล์ของคุณ - DNS Manager',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; border: 1px solid #334155; overflow: hidden;">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); padding: 16px 24px; border-radius: 12px; margin-bottom: 20px;">
                      <span style="font-size: 28px; font-weight: 700; color: white; letter-spacing: -0.5px;">🌐 DNS Manager</span>
                    </div>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 20px 40px;">
                    <h1 style="color: #f1f5f9; font-size: 24px; margin: 0 0 16px; font-weight: 600;">
                      สวัสดี ${name}! 👋
                    </h1>
                    <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                      ขอบคุณที่สมัครใช้งาน DNS Manager กรุณายืนยันอีเมล์ของคุณโดยคลิกปุ่มด้านล่าง
                    </p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4);">
                            ✅ ยืนยันอีเมล์
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
                      หรือคัดลอก URL นี้ไปวางในเบราว์เซอร์:<br>
                      <span style="color: #38bdf8; word-break: break-all;">${verifyUrl}</span>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; border-top: 1px solid #334155;">
                    <p style="color: #64748b; font-size: 12px; margin: 0; text-align: center;">
                      ลิงก์นี้จะหมดอายุใน 24 ชั่วโมง<br>
                      หากคุณไม่ได้สมัครสมาชิก กรุณาเพิกเฉยอีเมล์นี้
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}

export async function sendResetPasswordEmail(email: string, token: string, name: string): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  
  await transporter.sendMail({
    from: `"DNS Manager" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '🔑 รีเซ็ตรหัสผ่าน - DNS Manager',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; border: 1px solid #334155; overflow: hidden;">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 16px 24px; border-radius: 12px; margin-bottom: 20px;">
                      <span style="font-size: 28px; font-weight: 700; color: white; letter-spacing: -0.5px;">🔑 Reset Password</span>
                    </div>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 20px 40px;">
                    <h1 style="color: #f1f5f9; font-size: 24px; margin: 0 0 16px; font-weight: 600;">
                      สวัสดี ${name}! 
                    </h1>
                    <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                      เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ คลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่
                    </p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
                            🔐 รีเซ็ตรหัสผ่าน
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
                      หรือคัดลอก URL นี้ไปวางในเบราว์เซอร์:<br>
                      <span style="color: #fbbf24; word-break: break-all;">${resetUrl}</span>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; border-top: 1px solid #334155;">
                    <p style="color: #64748b; font-size: 12px; margin: 0; text-align: center;">
                      ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง<br>
                      หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยอีเมล์นี้
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}
