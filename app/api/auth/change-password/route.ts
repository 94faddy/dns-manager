import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser, hashPassword, verifyPassword } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }, { status: 400 });
    }

    // Get current password hash
    const [users] = await pool.execute<RowDataPacket[]>(
      'SELECT password FROM users WHERE id = ?',
      [user.id]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, users[0].password);
    if (!isValid) {
      return NextResponse.json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await pool.execute(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, user.id]
    );

    return NextResponse.json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านสำเร็จ'
    });

  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
