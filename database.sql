-- =============================================
-- DNS Manager Database Schema
-- =============================================

-- =============================================
-- 1. Application Tables (สำหรับ Next.js)
-- =============================================

-- ตาราง Users
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255) NULL,
    reset_token VARCHAR(255) NULL,
    reset_token_expires DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_verification_token (verification_token),
    INDEX idx_reset_token (reset_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง Zones (โดเมนที่ user เพิ่ม)
CREATE TABLE IF NOT EXISTS zones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    status ENUM('active', 'pending', 'disabled') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_domain (domain),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง Records (DNS records ของแต่ละ zone)
CREATE TABLE IF NOT EXISTS records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    zone_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL,
    content TEXT NOT NULL,
    ttl INT DEFAULT 3600,
    priority INT NULL,
    disabled BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
    INDEX idx_zone_id (zone_id),
    INDEX idx_type (type),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 2. PowerDNS Tables (สำหรับ DNS Server)
-- =============================================

-- ตาราง Domains ของ PowerDNS
CREATE TABLE IF NOT EXISTS pdns_domains (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    master VARCHAR(128) DEFAULT NULL,
    last_check INT DEFAULT NULL,
    type VARCHAR(6) NOT NULL DEFAULT 'NATIVE',
    notified_serial INT UNSIGNED DEFAULT NULL,
    account VARCHAR(40) DEFAULT NULL,
    UNIQUE KEY name_index (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง Records ของ PowerDNS
CREATE TABLE IF NOT EXISTS pdns_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    domain_id INT DEFAULT NULL,
    name VARCHAR(255) DEFAULT NULL,
    type VARCHAR(10) DEFAULT NULL,
    content VARCHAR(65535) DEFAULT NULL,
    ttl INT DEFAULT NULL,
    prio INT DEFAULT NULL,
    disabled TINYINT(1) DEFAULT 0,
    ordername VARCHAR(255) BINARY DEFAULT NULL,
    auth TINYINT(1) DEFAULT 1,
    FOREIGN KEY (domain_id) REFERENCES pdns_domains(id) ON DELETE CASCADE,
    INDEX nametype_index (name, type),
    INDEX domain_id (domain_id),
    INDEX ordername (ordername)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง Supermasters (optional - สำหรับ slave DNS)
CREATE TABLE IF NOT EXISTS pdns_supermasters (
    ip VARCHAR(64) NOT NULL,
    nameserver VARCHAR(255) NOT NULL,
    account VARCHAR(40) NOT NULL,
    PRIMARY KEY (ip, nameserver)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง Comments (optional - สำหรับ comment records)
CREATE TABLE IF NOT EXISTS pdns_comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    domain_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL,
    modified_at INT NOT NULL,
    account VARCHAR(40) DEFAULT NULL,
    comment TEXT NOT NULL,
    FOREIGN KEY (domain_id) REFERENCES pdns_domains(id) ON DELETE CASCADE,
    INDEX comments_domain_id_idx (domain_id),
    INDEX comments_name_type_idx (name, type),
    INDEX comments_order_idx (domain_id, modified_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง Domain Metadata (optional - สำหรับ DNSSEC)
CREATE TABLE IF NOT EXISTS pdns_domainmetadata (
    id INT PRIMARY KEY AUTO_INCREMENT,
    domain_id INT NOT NULL,
    kind VARCHAR(32),
    content TEXT,
    FOREIGN KEY (domain_id) REFERENCES pdns_domains(id) ON DELETE CASCADE,
    INDEX domainmetadata_idx (domain_id, kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง Cryptokeys (optional - สำหรับ DNSSEC)
CREATE TABLE IF NOT EXISTS pdns_cryptokeys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    domain_id INT NOT NULL,
    flags INT NOT NULL,
    active BOOL,
    published BOOL DEFAULT TRUE,
    content TEXT,
    FOREIGN KEY (domain_id) REFERENCES pdns_domains(id) ON DELETE CASCADE,
    INDEX domainidindex (domain_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง TSIG Keys (optional - สำหรับ zone transfer)
CREATE TABLE IF NOT EXISTS pdns_tsigkeys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    algorithm VARCHAR(50),
    secret VARCHAR(255),
    UNIQUE KEY namealgoindex (name, algorithm)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
