import pool from './db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Server IP ที่จะใช้เป็น Proxy
const PROXY_IP = process.env.NS_IP_PRIMARY || '72.62.74.183';
const NGINX_SITES_PATH = process.env.NGINX_SITES_PATH || '/etc/nginx/sites-enabled';
const NGINX_RELOAD_CMD = process.env.NGINX_RELOAD_CMD || 'sudo nginx -s reload';

export interface ProxyConfig {
  id: number;
  zone_id: number;
  record_id: number;
  domain: string;
  origin_ip: string;
  origin_port: number;
  ssl_enabled: boolean;
  cache_enabled: boolean;
}

// Get proxy IP (IP ที่จะตอบเมื่อ proxied=ON)
export function getProxyIP(): string {
  return PROXY_IP;
}

// Check if record should be proxied
export async function isRecordProxied(recordId: number): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT proxied FROM app_records WHERE id = ?',
    [recordId]
  );
  return rows.length > 0 && rows[0].proxied === 1;
}

// Get DNS response IP based on proxy status
export async function getDNSResponseIP(recordId: number, originalContent: string): Promise<string> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT proxied, origin_ip FROM app_records WHERE id = ?',
    [recordId]
  );
  
  if (rows.length === 0) return originalContent;
  
  const record = rows[0];
  
  if (record.proxied === 1) {
    // Return our proxy server IP
    return PROXY_IP;
  }
  
  // Return original IP (DNS Only mode)
  return originalContent;
}

// Toggle proxy status for a record
export async function toggleRecordProxy(
  recordId: number, 
  proxied: boolean, 
  originIp?: string
): Promise<void> {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get record details
    const [records] = await connection.execute<RowDataPacket[]>(
      `SELECT r.*, z.domain as zone_domain 
       FROM app_records r 
       JOIN app_zones z ON r.zone_id = z.id 
       WHERE r.id = ?`,
      [recordId]
    );
    
    if (records.length === 0) {
      throw new Error('Record not found');
    }
    
    const record = records[0];
    
    // Only A and AAAA records can be proxied
    if (!['A', 'AAAA'].includes(record.type)) {
      throw new Error('Only A and AAAA records can be proxied');
    }
    
    // Update record
    if (proxied) {
      // Store original IP and set proxied
      await connection.execute(
        `UPDATE app_records SET 
          proxied = 1, 
          origin_ip = COALESCE(?, content),
          updated_at = NOW()
         WHERE id = ?`,
        [originIp || record.content, recordId]
      );
      
      // Create/update proxy config
      await connection.execute(
        `INSERT INTO app_proxy_configs (zone_id, record_id, domain, origin_ip, origin_port) 
         VALUES (?, ?, ?, ?, 80)
         ON DUPLICATE KEY UPDATE 
           origin_ip = VALUES(origin_ip),
           updated_at = NOW()`,
        [record.zone_id, recordId, record.name, originIp || record.content]
      );
      
      // Update PowerDNS to return proxy IP
      await connection.execute(
        `UPDATE records SET content = ? 
         WHERE domain_id = (SELECT id FROM domains WHERE name = ?) 
         AND name = ? AND type = ?`,
        [PROXY_IP, record.zone_domain, record.name, record.type]
      );
      
    } else {
      // Restore original IP
      const originalIp = record.origin_ip || record.content;
      
      await connection.execute(
        `UPDATE app_records SET 
          proxied = 0,
          updated_at = NOW()
         WHERE id = ?`,
        [recordId]
      );
      
      // Remove proxy config
      await connection.execute(
        'DELETE FROM app_proxy_configs WHERE record_id = ?',
        [recordId]
      );
      
      // Update PowerDNS to return original IP
      await connection.execute(
        `UPDATE records SET content = ? 
         WHERE domain_id = (SELECT id FROM domains WHERE name = ?) 
         AND name = ? AND type = ?`,
        [originalIp, record.zone_domain, record.name, record.type]
      );
    }
    
    await connection.commit();
    
    // Regenerate Nginx config
    await generateNginxConfig();
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Generate Nginx config for all proxied domains
export async function generateNginxConfig(): Promise<void> {
  const [configs] = await pool.execute<RowDataPacket[]>(
    `SELECT pc.*, z.ssl_mode 
     FROM app_proxy_configs pc
     JOIN app_zones z ON pc.zone_id = z.id`
  );
  
  if (configs.length === 0) {
    // No proxied domains, create empty config
    const emptyConfig = '# No proxied domains configured\n';
    await fs.writeFile(`${NGINX_SITES_PATH}/dns-proxy-domains.conf`, emptyConfig);
    return;
  }
  
  let nginxConfig = `# Auto-generated DNS Proxy Configuration
# Generated at: ${new Date().toISOString()}
# DO NOT EDIT MANUALLY - Changes will be overwritten

`;

  for (const config of configs) {
    nginxConfig += generateServerBlock(config as ProxyConfig);
  }
  
  // Write config file
  const configPath = `${NGINX_SITES_PATH}/dns-proxy-domains.conf`;
  await fs.writeFile(configPath, nginxConfig);
  
  // Test and reload Nginx
  try {
    await execAsync('sudo nginx -t');
    await execAsync(NGINX_RELOAD_CMD);
  } catch (error) {
    console.error('Nginx reload failed:', error);
    throw new Error('Failed to reload Nginx configuration');
  }
}

// Generate Nginx server block for a domain
function generateServerBlock(config: ProxyConfig): string {
  return `
# ${config.domain}
server {
    listen 80;
    listen [::]:80;
    server_name ${config.domain};

    # Proxy headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;

    # WebSocket support
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Buffer settings
    proxy_buffering on;
    proxy_buffer_size 4k;
    proxy_buffers 8 4k;

    location / {
        proxy_pass http://${config.origin_ip}:${config.origin_port};
    }

    # Error pages
    error_page 502 503 504 /proxy_error.html;
    location = /proxy_error.html {
        internal;
        default_type text/html;
        return 502 '<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Origin Server Error</h1><p>The origin server is not responding.</p></body></html>';
    }
}

`;
}

// Get all proxy configs
export async function getAllProxyConfigs(): Promise<ProxyConfig[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM app_proxy_configs ORDER BY domain'
  );
  return rows as ProxyConfig[];
}

// Sync all proxied records to Nginx
export async function syncAllProxiedRecords(): Promise<{ success: number; failed: number }> {
  const [records] = await pool.execute<RowDataPacket[]>(
    `SELECT r.*, z.domain as zone_domain 
     FROM app_records r 
     JOIN app_zones z ON r.zone_id = z.id 
     WHERE r.proxied = 1 AND r.type IN ('A', 'AAAA')`
  );
  
  let success = 0;
  let failed = 0;
  
  for (const record of records) {
    try {
      // Ensure proxy config exists
      await pool.execute(
        `INSERT INTO app_proxy_configs (zone_id, record_id, domain, origin_ip, origin_port) 
         VALUES (?, ?, ?, ?, 80)
         ON DUPLICATE KEY UPDATE 
           origin_ip = VALUES(origin_ip),
           updated_at = NOW()`,
        [record.zone_id, record.id, record.name, record.origin_ip || record.content]
      );
      success++;
    } catch (error) {
      console.error(`Failed to sync record ${record.id}:`, error);
      failed++;
    }
  }
  
  // Regenerate Nginx config
  await generateNginxConfig();
  
  return { success, failed };
}