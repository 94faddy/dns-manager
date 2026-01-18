import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateRandomToken } from '@/lib/auth';
import { sendResetPasswordEmail } from '@/lib/mail';
import { RowDataPacket } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'กรุณากรอกอีเมล์' },
        { status: 400 }
      );
    }

    // Find user
    const [users] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    // Always return success (prevent email enumeration)
    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'หากอีเมล์นี้มีอยู่ในระบบ เราจะส่งลิงก์รีเซ็ตรหัสผ่านไปให้'
      });
    }

    const user = users[0];

    // Generate reset token
    const resetToken = generateRandomToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token
    await pool.execute(
      'UPDATE users SET reset_token = ?, reset_token_expires = ?, updated_at = NOW() WHERE id = ?',
      [resetToken, resetExpires, user.id]
    );

    // Send email
    try {
      await sendResetPasswordEmail(email, resetToken, user.name);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'หากอีเมล์นี้มีอยู่ในระบบ เราจะส่งลิงก์รีเซ็ตรหัสผ่านไปให้'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
