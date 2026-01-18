import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import pool, { User } from './db';
import { RowDataPacket } from 'mysql2';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface JWTPayload {
  userId: number;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) return null;
    
    const payload = verifyToken(token);
    if (!payload) return null;
    
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ?',
      [payload.userId]
    );
    
    if (rows.length === 0) return null;
    
    return rows[0] as User;
  } catch {
    return null;
  }
}

export function generateRandomToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
