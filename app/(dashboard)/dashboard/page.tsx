import { getCurrentUser } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import Link from 'next/link';
import { 
  Globe, 
  Server, 
  FileText, 
  Plus,
  ArrowRight,
  Activity,
  Shield,
  Zap
} from 'lucide-react';

async function getStats(userId: number) {
  try {
    const [zones] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM app_zones WHERE user_id = ?',
      [userId]
    );
    
    const [records] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM app_records r 
       JOIN app_zones z ON r.zone_id = z.id 
       WHERE z.user_id = ?`,
      [userId]
    );

    const [recentZones] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM app_zones WHERE user_id = ? ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );

    return {
      totalZones: zones[0].count,
      totalRecords: records[0].count,
      recentZones: recentZones
    };
  } catch {
    return {
      totalZones: 0,
      totalRecords: 0,
      recentZones: []
    };
  }
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const stats = await getStats(user.id);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          สวัสดี, {user.name}! 👋
        </h1>
        <p className="text-slate-400">
          ยินดีต้อนรับสู่ระบบจัดการ DNS ของคุณ
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center">
              <Server className="w-6 h-6 text-sky-400" />
            </div>
            <span className="badge badge-info">Active</span>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{stats.totalZones}</h3>
          <p className="text-slate-400 text-sm">โดเมนทั้งหมด</p>
        </div>

        <div className="glass rounded-2xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="badge badge-success">Synced</span>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{stats.totalRecords}</h3>
          <p className="text-slate-400 text-sm">DNS Records</p>
        </div>

        <div className="glass rounded-2xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-amber-400" />
            </div>
            <span className="badge badge-warning">99.9%</span>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">Online</h3>
          <p className="text-slate-400 text-sm">สถานะ DNS Server</p>
        </div>

        <div className="glass rounded-2xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-violet-400" />
            </div>
            <span className="badge badge-info">Protected</span>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">DNSSEC</h3>
          <p className="text-slate-400 text-sm">ความปลอดภัย</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass rounded-2xl p-6 border border-slate-700/50">
        <h2 className="text-xl font-bold text-white mb-4">เริ่มต้นใช้งาน</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/zones"
            className="group flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 hover:bg-gradient-to-r hover:from-sky-500/20 hover:to-indigo-500/20 border border-transparent hover:border-sky-500/30 transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6 text-sky-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white group-hover:text-sky-400 transition-colors">เพิ่มโดเมนใหม่</h3>
              <p className="text-sm text-slate-400">เริ่มจัดการ DNS สำหรับโดเมนของคุณ</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href="/records"
            className="group flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 hover:bg-gradient-to-r hover:from-emerald-500/20 hover:to-teal-500/20 border border-transparent hover:border-emerald-500/30 transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors">จัดการ Records</h3>
              <p className="text-sm text-slate-400">แก้ไข A, CNAME, MX, TXT...</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href="/settings"
            className="group flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 hover:bg-gradient-to-r hover:from-violet-500/20 hover:to-purple-500/20 border border-transparent hover:border-violet-500/30 transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-violet-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white group-hover:text-violet-400 transition-colors">ตั้งค่า Nameservers</h3>
              <p className="text-sm text-slate-400">ดู Nameserver ที่ต้องชี้</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>

      {/* Recent Zones */}
      <div className="glass rounded-2xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">โดเมนล่าสุด</h2>
          <Link
            href="/zones"
            className="text-sm text-sky-400 hover:text-sky-300 transition-colors"
          >
            ดูทั้งหมด →
          </Link>
        </div>
        
        {stats.recentZones.length > 0 ? (
          <div className="space-y-3">
            {stats.recentZones.map((zone: any) => (
              <Link
                key={zone.id}
                href={`/records?zone_id=${zone.id}`}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500/20 to-indigo-500/20 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white group-hover:text-sky-400 transition-colors">
                      {zone.domain}
                    </h3>
                    <p className="text-xs text-slate-400">
                      เพิ่มเมื่อ {new Date(zone.created_at).toLocaleDateString('th-TH')}
                    </p>
                  </div>
                </div>
                <span className={`badge ${zone.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                  {zone.status === 'active' ? 'Active' : 'Pending'}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Globe className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 mb-4">ยังไม่มีโดเมน</p>
            <Link
              href="/zones"
              className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              เพิ่มโดเมนแรก
            </Link>
          </div>
        )}
      </div>

      {/* Nameserver Info */}
      <div className="glass rounded-2xl p-6 border border-slate-700/50">
        <h2 className="text-xl font-bold text-white mb-4">🔧 Nameserver Configuration</h2>
        <p className="text-slate-400 mb-4">
          ให้ชี้ Nameserver ของโดเมนมาที่ DNS Server ของเรา:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-800/50 font-mono">
            <p className="text-sm text-slate-400 mb-1">Primary NS</p>
            <p className="text-sky-400">{process.env.NS1_HOSTNAME || 'ns1.yourdomain.com'}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/50 font-mono">
            <p className="text-sm text-slate-400 mb-1">Secondary NS</p>
            <p className="text-sky-400">{process.env.NS2_HOSTNAME || 'ns2.yourdomain.com'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
