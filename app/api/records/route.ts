import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { 
  syncZoneToPowerDNS, 
  syncRecordToPowerDNS, 
  deleteRecordFromPowerDNS,
  validateRecordContent 
} from '@/lib/powerdns';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const VALID_RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA', 'PTR'];

// Get records for a zone
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get('zone_id');

    if (!zoneId) {
      return NextResponse.json({ error: 'กรุณาระบุ Zone ID' }, { status: 400 });
    }

    // Verify zone ownership
    const [zones] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM app_zones WHERE id = ? AND user_id = ?',
      [zoneId, user.id]
    );

    if (zones.length === 0) {
      return NextResponse.json({ error: 'ไม่พบโดเมนนี้' }, { status: 404 });
    }

    const [records] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM app_records WHERE zone_id = ? ORDER BY type, name',
      [zoneId]
    );

    return NextResponse.json({ 
      zone: zones[0],
      records 
    });

  } catch (error) {
    console.error('Get records error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// Create new record
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { zone_id, name, type, content, ttl = 3600, priority = null } = await request.json();

    // Validation
    if (!zone_id || !name || !type || !content) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    if (!VALID_RECORD_TYPES.includes(type)) {
      return NextResponse.json({ error: 'ประเภท Record ไม่ถูกต้อง' }, { status: 400 });
    }

    // Verify zone ownership
    const [zones] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM app_zones WHERE id = ? AND user_id = ?',
      [zone_id, user.id]
    );

    if (zones.length === 0) {
      return NextResponse.json({ error: 'ไม่พบโดเมนนี้' }, { status: 404 });
    }

    const zone = zones[0];

    // Validate content based on type
    const validation = validateRecordContent(type, content);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Build full record name
    let fullName = name;
    if (name === '@' || name === '') {
      fullName = zone.domain;
    } else if (!name.endsWith(zone.domain)) {
      fullName = `${name}.${zone.domain}`;
    }

    // Check for duplicate
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM app_records WHERE zone_id = ? AND name = ? AND type = ? AND content = ?',
      [zone_id, fullName, type, content]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Record นี้มีอยู่แล้ว' }, { status: 400 });
    }

    // Create record in our database
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO app_records (zone_id, name, type, content, ttl, priority, disabled, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
      [zone_id, fullName, type, content, ttl, priority]
    );

    // Sync to PowerDNS
    try {
      const pdnsId = await syncZoneToPowerDNS(zone.domain);
      await syncRecordToPowerDNS(pdnsId, fullName, type, content, ttl, priority);
    } catch (pdnsError) {
      console.error('PowerDNS sync error:', pdnsError);
    }

    return NextResponse.json({
      success: true,
      message: 'เพิ่ม Record สำเร็จ',
      record: {
        id: result.insertId,
        name: fullName,
        type,
        content,
        ttl,
        priority
      }
    });

  } catch (error) {
    console.error('Create record error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// Update record
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, content, ttl, priority, disabled } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'กรุณาระบุ Record ID' }, { status: 400 });
    }

    // Get record and verify ownership
    const [records] = await pool.execute<RowDataPacket[]>(
      `SELECT r.*, z.domain, z.user_id 
       FROM app_records r 
       JOIN app_zones z ON r.zone_id = z.id 
       WHERE r.id = ?`,
      [id]
    );

    if (records.length === 0) {
      return NextResponse.json({ error: 'ไม่พบ Record นี้' }, { status: 404 });
    }

    const record = records[0];

    if (record.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate content if provided
    if (content) {
      const validation = validateRecordContent(record.type, content);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    // Update record
    await pool.execute(
      `UPDATE app_records SET 
        content = COALESCE(?, content),
        ttl = COALESCE(?, ttl),
        priority = COALESCE(?, priority),
        disabled = COALESCE(?, disabled),
        updated_at = NOW()
       WHERE id = ?`,
      [content, ttl, priority, disabled, id]
    );

    // Sync to PowerDNS
    try {
      const pdnsId = await syncZoneToPowerDNS(record.domain);
      await syncRecordToPowerDNS(
        pdnsId, 
        record.name, 
        record.type, 
        content || record.content, 
        ttl || record.ttl, 
        priority ?? record.priority,
        disabled ?? record.disabled
      );
    } catch (pdnsError) {
      console.error('PowerDNS sync error:', pdnsError);
    }

    return NextResponse.json({
      success: true,
      message: 'อัพเดท Record สำเร็จ'
    });

  } catch (error) {
    console.error('Update record error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// Delete record
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'กรุณาระบุ Record ID' }, { status: 400 });
    }

    // Get record and verify ownership
    const [records] = await pool.execute<RowDataPacket[]>(
      `SELECT r.*, z.domain, z.user_id 
       FROM app_records r 
       JOIN app_zones z ON r.zone_id = z.id 
       WHERE r.id = ?`,
      [id]
    );

    if (records.length === 0) {
      return NextResponse.json({ error: 'ไม่พบ Record นี้' }, { status: 404 });
    }

    const record = records[0];

    if (record.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete from PowerDNS
    try {
      const pdnsId = await syncZoneToPowerDNS(record.domain);
      await deleteRecordFromPowerDNS(pdnsId, record.name, record.type, record.content);
    } catch (pdnsError) {
      console.error('PowerDNS delete error:', pdnsError);
    }

    // Delete from our database
    await pool.execute('DELETE FROM app_records WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'ลบ Record สำเร็จ'
    });

  } catch (error) {
    console.error('Delete record error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
