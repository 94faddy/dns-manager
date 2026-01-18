import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' },
        { status: 400 }
      );
    }

    // Find user with valid token
    const [users] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Token ไม่ถูกต้องหรือหมดอายุแล้ว' },
        { status: 400 }
      );
    }

    const user = users[0];

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update password and clear token
    await pool.execute(
      `UPDATE users SET 
        password = ?, 
        reset_token = NULL, 
        reset_token_expires = NULL, 
        updated_at = NOW() 
       WHERE id = ?`,
      [hashedPassword, user.id]
    );

    return NextResponse.json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านสำเร็จ คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
