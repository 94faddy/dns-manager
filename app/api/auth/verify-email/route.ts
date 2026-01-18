import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // Find user with token
    const [users] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE verification_token = ?',
      [token]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Token ไม่ถูกต้องหรือหมดอายุแล้ว' },
        { status: 400 }
      );
    }

    const user = users[0];

    if (user.is_verified) {
      return NextResponse.json(
        { error: 'บัญชีนี้ได้รับการยืนยันแล้ว' },
        { status: 400 }
      );
    }

    // Verify user
    await pool.execute(
      'UPDATE users SET is_verified = 1, verification_token = NULL, updated_at = NOW() WHERE id = ?',
      [user.id]
    );

    return NextResponse.json({
      success: true,
      message: 'ยืนยันอีเมล์สำเร็จ คุณสามารถเข้าสู่ระบบได้แล้ว'
    });

  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
