import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { toggleRecordProxy, getProxyIP, generateNginxConfig } from '@/lib/proxy';
import { RowDataPacket } from 'mysql2';

// Toggle proxy for a record
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { record_id, proxied } = await request.json();

    if (record_id === undefined || proxied === undefined) {
      return NextResponse.json(
        { error: 'กรุณาระบุ record_id และ proxied' },
        { status: 400 }
      );
    }

    // Verify record ownership
    const [records] = await pool.execute<RowDataPacket[]>(
      `SELECT r.*, z.user_id, z.domain as zone_domain
       FROM app_records r 
       JOIN app_zones z ON r.zone_id = z.id 
       WHERE r.id = ?`,
      [record_id]
    );

    if (records.length === 0) {
      return NextResponse.json({ error: 'ไม่พบ Record นี้' }, { status: 404 });
    }

    const record = records[0];

    if (record.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only A and AAAA records can be proxied
    if (!['A', 'AAAA'].includes(record.type)) {
      return NextResponse.json(
        { error: 'เฉพาะ Record ประเภท A และ AAAA เท่านั้นที่สามารถเปิด Proxy ได้' },
        { status: 400 }
      );
    }

    // Toggle proxy
    await toggleRecordProxy(record_id, proxied, record.content);

    const proxyIP = getProxyIP();

    return NextResponse.json({
      success: true,
      message: proxied 
        ? `เปิด Proxy สำเร็จ - IP จะแสดงเป็น ${proxyIP}` 
        : 'ปิด Proxy สำเร็จ - IP จะแสดงเป็นค่าเดิม',
      data: {
        proxied,
        displayed_ip: proxied ? proxyIP : record.content,
        origin_ip: record.content
      }
    });

  } catch (error) {
    console.error('Toggle proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}

// Get proxy status for records
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get('zone_id');

    if (!zoneId) {
      return NextResponse.json({ error: 'กรุณาระบุ zone_id' }, { status: 400 });
    }

    // Verify zone ownership
    const [zones] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM app_zones WHERE id = ? AND user_id = ?',
      [zoneId, user.id]
    );

    if (zones.length === 0) {
      return NextResponse.json({ error: 'ไม่พบโดเมนนี้' }, { status: 404 });
    }

    // Get records with proxy status
    const [records] = await pool.execute<RowDataPacket[]>(
      `SELECT r.id, r.name, r.type, r.content, r.proxied, r.origin_ip,
              CASE WHEN r.proxied = 1 THEN ? ELSE r.content END as displayed_ip
       FROM app_records r 
       WHERE r.zone_id = ? AND r.type IN ('A', 'AAAA')
       ORDER BY r.name`,
      [getProxyIP(), zoneId]
    );

    return NextResponse.json({
      proxy_ip: getProxyIP(),
      records
    });

  } catch (error) {
    console.error('Get proxy status error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// Manually sync Nginx config
export async function PUT() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await generateNginxConfig();

    return NextResponse.json({
      success: true,
      message: 'Sync Nginx configuration สำเร็จ'
    });

  } catch (error) {
    console.error('Sync nginx error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}