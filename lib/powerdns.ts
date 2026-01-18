import pool from './db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// PowerDNS Database Tables Management
// This works directly with PowerDNS MySQL backend

export interface PDNSDomain {
  id: number;
  name: string;
  master: string | null;
  last_check: number | null;
  type: string;
  notified_serial: number | null;
  account: string | null;
}

export interface PDNSRecord {
  id: number;
  domain_id: number;
  name: string;
  type: string;
  content: string;
  ttl: number;
  prio: number | null;
  disabled: boolean;
  ordername: string | null;
  auth: boolean;
}

// Sync zone to PowerDNS domains table
export async function syncZoneToPowerDNS(domain: string): Promise<number> {
  const [existing] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM domains WHERE name = ?',
    [domain]
  );
  
  if (existing.length > 0) {
    return existing[0].id;
  }
  
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO domains (name, type, account) VALUES (?, 'NATIVE', 'admin')`,
    [domain]
  );
  
  return result.insertId;
}

// Sync record to PowerDNS records table
export async function syncRecordToPowerDNS(
  domainId: number,
  name: string,
  type: string,
  content: string,
  ttl: number = 3600,
  prio: number | null = null,
  disabled: boolean = false
): Promise<number> {
  // Check if record exists
  const [existing] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM records WHERE domain_id = ? AND name = ? AND type = ? AND content = ?',
    [domainId, name, type, content]
  );
  
  if (existing.length > 0) {
    // Update existing
    await pool.execute(
      'UPDATE records SET ttl = ?, prio = ?, disabled = ? WHERE id = ?',
      [ttl, prio, disabled ? 1 : 0, existing[0].id]
    );
    return existing[0].id;
  }
  
  // Insert new
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO records (domain_id, name, type, content, ttl, prio, disabled, auth) 
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [domainId, name, type, content, ttl, prio, disabled ? 1 : 0]
  );
  
  return result.insertId;
}

// Delete record from PowerDNS
export async function deleteRecordFromPowerDNS(
  domainId: number,
  name: string,
  type: string,
  content: string
): Promise<void> {
  await pool.execute(
    'DELETE FROM records WHERE domain_id = ? AND name = ? AND type = ? AND content = ?',
    [domainId, name, type, content]
  );
}

// Delete zone from PowerDNS
export async function deleteZoneFromPowerDNS(domain: string): Promise<void> {
  const [existing] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM domains WHERE name = ?',
    [domain]
  );
  
  if (existing.length > 0) {
    await pool.execute('DELETE FROM records WHERE domain_id = ?', [existing[0].id]);
    await pool.execute('DELETE FROM domains WHERE id = ?', [existing[0].id]);
  }
}

// Get current serial for SOA
export function generateSerial(): number {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  return parseInt(dateStr + '01');
}

// Create default records for new zone
export async function createDefaultRecords(
  domainId: number, 
  domain: string,
  ns1: string,
  ns2: string,
  primaryIp: string
): Promise<void> {
  const serial = generateSerial();
  const soaContent = `${ns1}. hostmaster.${domain}. ${serial} 10800 3600 604800 3600`;
  
  // SOA Record
  await syncRecordToPowerDNS(domainId, domain, 'SOA', soaContent, 3600);
  
  // NS Records
  await syncRecordToPowerDNS(domainId, domain, 'NS', `${ns1}.`, 86400);
  await syncRecordToPowerDNS(domainId, domain, 'NS', `${ns2}.`, 86400);
  
  // Default A record for root domain
  await syncRecordToPowerDNS(domainId, domain, 'A', primaryIp, 3600);
  
  // Default A record for www
  await syncRecordToPowerDNS(domainId, `www.${domain}`, 'A', primaryIp, 3600);
}

// Validate record content based on type
export function validateRecordContent(type: string, content: string): { valid: boolean; error?: string } {
  switch (type) {
    case 'A':
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipv4Regex.test(content)) {
        return { valid: false, error: 'Invalid IPv4 address format' };
      }
      const parts = content.split('.').map(Number);
      if (parts.some(p => p > 255)) {
        return { valid: false, error: 'Invalid IPv4 address - octets must be 0-255' };
      }
      break;
      
    case 'AAAA':
      const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:$/;
      if (!ipv6Regex.test(content)) {
        return { valid: false, error: 'Invalid IPv6 address format' };
      }
      break;
      
    case 'CNAME':
    case 'NS':
      if (!content.endsWith('.')) {
        return { valid: false, error: 'CNAME/NS content must end with a dot (.)' };
      }
      break;
      
    case 'MX':
      if (!content.endsWith('.')) {
        return { valid: false, error: 'MX content must end with a dot (.)' };
      }
      break;
      
    case 'TXT':
      // TXT records should be quoted if containing spaces
      break;
      
    case 'SRV':
      // Format: weight port target
      const srvParts = content.split(' ');
      if (srvParts.length !== 3) {
        return { valid: false, error: 'SRV format: weight port target' };
      }
      break;
      
    case 'CAA':
      // Format: flag tag value
      const caaParts = content.split(' ');
      if (caaParts.length < 3) {
        return { valid: false, error: 'CAA format: flag tag "value"' };
      }
      break;
  }
  
  return { valid: true };
}

// Get all records for a domain from PowerDNS
export async function getZoneRecords(domain: string): Promise<PDNSRecord[]> {
  const [domains] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM domains WHERE name = ?',
    [domain]
  );
  
  if (domains.length === 0) return [];
  
  const [records] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM records WHERE domain_id = ? ORDER BY type, name',
    [domains[0].id]
  );
  
  return records as PDNSRecord[];
}
