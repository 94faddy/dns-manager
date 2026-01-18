import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dns_manager',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;

// Types
export interface User {
  id: number;
  email: string;
  password: string;
  name: string;
  is_verified: boolean;
  verification_token: string | null;
  reset_token: string | null;
  reset_token_expires: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Zone {
  id: number;
  user_id: number;
  domain: string;
  status: 'active' | 'pending' | 'disabled';
  created_at: Date;
  updated_at: Date;
}

export interface Record {
  id: number;
  zone_id: number;
  name: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SOA' | 'SRV' | 'CAA' | 'PTR';
  content: string;
  ttl: number;
  priority: number | null;
  disabled: boolean;
  created_at: Date;
  updated_at: Date;
}
