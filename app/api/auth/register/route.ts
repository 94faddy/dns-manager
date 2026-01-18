import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword, generateRandomToken } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/mail';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // Validation
    if (!name || !email || !password) {
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

    // Check if email exists
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'อีเมล์นี้ถูกใช้งานแล้ว' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);
    const verificationToken = generateRandomToken();

    // Create user
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO users (name, email, password, verification_token, created_at, updated_at) 
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [name, email, hashedPassword, verificationToken]
    );

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken, name);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue anyway - user can request new verification email
    }

    return NextResponse.json({
      success: true,
      message: 'สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมล์เพื่อยืนยันบัญชี',
      userId: result.insertId
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
