# 🚀 คู่มือติดตั้ง DNS Manager

## 📋 ขั้นตอนการติดตั้ง

### ขั้นตอนที่ 1: ติดตั้ง Software บน VPS Ubuntu

```bash
# อัพเดท system
sudo apt update && sudo apt upgrade -y

# ติดตั้ง Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# ติดตั้ง PowerDNS
sudo apt install -y pdns-server pdns-backend-mysql

# ติดตั้ง PM2 (รัน Node.js แบบ background)
sudo npm install -g pm2

# ติดตั้ง Nginx
sudo apt install -y nginx
```

---

### ขั้นตอนที่ 2: สร้าง Database

เปิด MySQL client แล้วรัน:

```sql
-- สร้าง database
CREATE DATABASE dns_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- สร้าง user สำหรับ app (เปลี่ยน password ตามต้องการ)
CREATE USER 'dnsmanager'@'%' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON dns_manager.* TO 'dnsmanager'@'%';
FLUSH PRIVILEGES;

-- เลือก database
USE dns_manager;

-- รัน SQL จากไฟล์ database.sql
SOURCE /path/to/database.sql;
```

หรือ import ผ่าน command line:
```bash
mysql -h YOUR_DB_HOST -u root -p dns_manager < database.sql
```

---

### ขั้นตอนที่ 3: ตั้งค่า PowerDNS

แก้ไขไฟล์ `/etc/powerdns/pdns.conf`:

```bash
sudo nano /etc/powerdns/pdns.conf
```

ใส่ค่าเหล่านี้:

```ini
# ปิด default backend
# launch=

# ใช้ MySQL backend
launch=gmysql
gmysql-host=YOUR_DB_HOST
gmysql-port=3306
gmysql-dbname=dns_manager
gmysql-user=dnsmanager
gmysql-password=your_secure_password

# ใช้ชื่อตาราง pdns_
gmysql-dnssec=no
gmysql-domains-table=pdns_domains
gmysql-records-table=pdns_records
gmysql-comments-table=pdns_comments
gmysql-domainmetadata-table=pdns_domainmetadata
gmysql-cryptokeys-table=pdns_cryptokeys
gmysql-tsigkeys-table=pdns_tsigkeys

# ตั้งค่า DNS Server
local-address=0.0.0.0
local-port=53

# API (optional)
api=yes
api-key=YOUR_API_KEY_HERE
webserver=yes
webserver-address=127.0.0.1
webserver-port=8081
```

รีสตาร์ท PowerDNS:

```bash
sudo systemctl restart pdns
sudo systemctl enable pdns
sudo systemctl status pdns
```

---

### ขั้นตอนที่ 4: ติดตั้ง Next.js App

```bash
# สร้างโฟลเดอร์
mkdir -p /var/www/dns-manager
cd /var/www/dns-manager

# แตกไฟล์ zip
unzip dns-manager.zip
cd dns-manager

# ติดตั้ง dependencies
npm install

# สร้างไฟล์ .env
cp .env.example .env
nano .env
```

แก้ไข `.env`:

```env
# Database (ใส่ค่าจริง)
DB_HOST=YOUR_DB_HOST
DB_PORT=3306
DB_USER=dnsmanager
DB_PASSWORD=your_secure_password
DB_NAME=dns_manager

# JWT Secret (สร้างใหม่)
JWT_SECRET=ใส่-random-string-ยาวๆ-ที่นี่

# App URL
NEXT_PUBLIC_APP_URL=https://dns.yourdomain.com

# SMTP
SMTP_HOST=mail.nexzcloud.lol
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=support@nexzcloud.lol
SMTP_PASS=YOUR_SMTP_PASSWORD

# DNS Server Settings
NS1_HOSTNAME=ns1.yourdomain.com
NS2_HOSTNAME=ns2.yourdomain.com
NS_IP_PRIMARY=YOUR_VPS_IP
NS_IP_SECONDARY=YOUR_VPS_IP
```

Build และรัน:

```bash
# Build
npm run build

# รันด้วย PM2
pm2 start npm --name "dns-manager" -- start
pm2 save
pm2 startup
```

---

### ขั้นตอนที่ 5: ตั้งค่า Nginx

สร้างไฟล์ `/etc/nginx/sites-available/dns-manager`:

```nginx
server {
    listen 80;
    server_name dns.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

เปิดใช้งาน:

```bash
sudo ln -s /etc/nginx/sites-available/dns-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### ขั้นตอนที่ 6: เปิด Firewall

```bash
# เปิด port ที่จำเป็น
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 53/tcp    # DNS TCP
sudo ufw allow 53/udp    # DNS UDP
sudo ufw enable
```

---

### ขั้นตอนที่ 7: ตั้ง SSL (ถ้าใช้ Cloudflare)

ถ้าใช้ Cloudflare Proxy:
1. เปิด Cloudflare Dashboard
2. ไปที่ SSL/TLS → เลือก "Full" หรือ "Full (strict)"
3. Cloudflare จะจัดการ SSL ให้

ถ้าไม่ใช้ Cloudflare:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d dns.yourdomain.com
```

---

### ขั้นตอนที่ 8: ตั้ง Glue Records ที่ Registrar

ที่ผู้ให้บริการโดเมน (เช่น Namecheap, GoDaddy):

1. ไปที่ Advanced DNS หรือ Host Management
2. เพิ่ม Glue Records:
   - `ns1.yourdomain.com` → `YOUR_VPS_IP`
   - `ns2.yourdomain.com` → `YOUR_VPS_IP` (หรือ IP ตัวที่ 2 ถ้ามี)

3. ตั้ง Nameservers ของโดเมนเป็น:
   - `ns1.yourdomain.com`
   - `ns2.yourdomain.com`

---

## ✅ ทดสอบ

### ทดสอบ PowerDNS:
```bash
# ดู status
sudo systemctl status pdns

# ทดสอบ query (หลังเพิ่มโดเมนแล้ว)
dig @localhost example.com
```

### ทดสอบ Next.js:
```bash
# ดู logs
pm2 logs dns-manager

# ดู status
pm2 status
```

### ทดสอบจากภายนอก:
```bash
# ทดสอบ DNS
dig @YOUR_VPS_IP example.com

# ทดสอบเว็บ
curl https://dns.yourdomain.com
```

---

## ⚠️ Troubleshooting

### PowerDNS ไม่ start:
```bash
sudo journalctl -u pdns -f
```

### Next.js error:
```bash
pm2 logs dns-manager --lines 100
```

### Database connection error:
- ตรวจสอบ firewall ของ DB server
- ตรวจสอบ user มีสิทธิ์ connect จาก remote

---

## 📞 Support

หากมีปัญหา สามารถถามได้เลยครับ!
