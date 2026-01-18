import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกอีเมล์และรหัสผ่าน' },
        { status: 400 }
      );
    }

    // Find user
    const [users] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'อีเมล์หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const user = users[0];

    // Check password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'อีเมล์หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // Check if verified
    if (!user.is_verified) {
      return NextResponse.json(
        { error: 'กรุณายืนยันอีเมล์ก่อนเข้าสู่ระบบ' },
        { status: 403 }
      );
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email
    });

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

    // Set HTTP-only cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
