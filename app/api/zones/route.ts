import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { syncZoneToPowerDNS, createDefaultRecords, deleteZoneFromPowerDNS } from '@/lib/powerdns';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Get all zones for current user
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [zones] = await pool.execute<RowDataPacket[]>(
      `SELECT z.*, 
        (SELECT COUNT(*) FROM app_records WHERE zone_id = z.id) as record_count
       FROM app_zones z 
       WHERE z.user_id = ? 
       ORDER BY z.created_at DESC`,
      [user.id]
    );

    return NextResponse.json({ zones });

  } catch (error) {
    console.error('Get zones error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// Create new zone
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domain } = await request.json();

    if (!domain) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อโดเมน' }, { status: 400 });
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json({ error: 'รูปแบบโดเมนไม่ถูกต้อง' }, { status: 400 });
    }

    // Check if domain already exists
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM app_zones WHERE domain = ?',
      [domain.toLowerCase()]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: 'โดเมนนี้มีอยู่ในระบบแล้ว' }, { status: 400 });
    }

    // Create zone in our database
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO app_zones (user_id, domain, status, created_at, updated_at) 
       VALUES (?, ?, 'active', NOW(), NOW())`,
      [user.id, domain.toLowerCase()]
    );

    // Sync to PowerDNS
    const ns1 = process.env.NS1_HOSTNAME || 'ns1.example.com';
    const ns2 = process.env.NS2_HOSTNAME || 'ns2.example.com';
    const primaryIp = process.env.NS_IP_PRIMARY || '127.0.0.1';

    try {
      const pdnsId = await syncZoneToPowerDNS(domain.toLowerCase());
      await createDefaultRecords(pdnsId, domain.toLowerCase(), ns1, ns2, primaryIp);
    } catch (pdnsError) {
      console.error('PowerDNS sync error:', pdnsError);
      // Continue anyway - can be synced later
    }

    return NextResponse.json({
      success: true,
      message: 'เพิ่มโดเมนสำเร็จ',
      zone: {
        id: result.insertId,
        domain: domain.toLowerCase(),
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Create zone error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// Delete zone
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get('id');

    if (!zoneId) {
      return NextResponse.json({ error: 'กรุณาระบุ Zone ID' }, { status: 400 });
    }

    // Check ownership
    const [zones] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM app_zones WHERE id = ? AND user_id = ?',
      [zoneId, user.id]
    );

    if (zones.length === 0) {
      return NextResponse.json({ error: 'ไม่พบโดเมนนี้' }, { status: 404 });
    }

    const zone = zones[0];

    // Delete from PowerDNS
    try {
      await deleteZoneFromPowerDNS(zone.domain);
    } catch (pdnsError) {
      console.error('PowerDNS delete error:', pdnsError);
    }

    // Delete records first
    await pool.execute('DELETE FROM app_records WHERE zone_id = ?', [zoneId]);
    
    // Delete zone
    await pool.execute('DELETE FROM app_zones WHERE id = ?', [zoneId]);

    return NextResponse.json({
      success: true,
      message: 'ลบโดเมนสำเร็จ'
    });

  } catch (error) {
    console.error('Delete zone error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
