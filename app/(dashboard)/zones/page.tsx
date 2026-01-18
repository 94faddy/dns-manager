'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import {
  Globe,
  Plus,
  Trash2,
  ExternalLink,
  Search,
  RefreshCw,
  Server,
  FileText,
  Copy,
  Check
} from 'lucide-react';

interface Zone {
  id: number;
  domain: string;
  status: string;
  record_count: number;
  created_at: string;
}

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedNS, setCopiedNS] = useState<string | null>(null);

  const NS1 = 'ns1.nexzdns.my';
  const NS2 = 'ns2.nexzdns.my';

  const fetchZones = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/zones');
      const data = await res.json();
      if (res.ok) {
        setZones(data.zones);
      }
    } catch (error) {
      console.error('Error fetching zones:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const handleCopyNS = async (ns: string) => {
    try {
      await navigator.clipboard.writeText(ns);
      setCopiedNS(ns);
      setTimeout(() => setCopiedNS(null), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleAddZone = async () => {
    const { value: domain } = await Swal.fire({
      title: 'เพิ่มโดเมนใหม่',
      input: 'text',
      inputLabel: 'ชื่อโดเมน',
      inputPlaceholder: 'example.com',
      showCancelButton: true,
      confirmButtonText: 'เพิ่ม',
      cancelButtonText: 'ยกเลิก',
      inputValidator: (value) => {
        if (!value) {
          return 'กรุณากรอกชื่อโดเมน';
        }
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
        if (!domainRegex.test(value)) {
          return 'รูปแบบโดเมนไม่ถูกต้อง';
        }
        return null;
      }
    });

    if (domain) {
      try {
        const res = await fetch('/api/zones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain })
        });

        const data = await res.json();

        if (res.ok) {
          Swal.fire({
            icon: 'success',
            title: 'เพิ่มโดเมนสำเร็จ',
            text: `เพิ่ม ${domain} เรียบร้อยแล้ว`
          });
          fetchZones();
        } else {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: data.error
          });
        }
      } catch {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'
        });
      }
    }
  };

  const handleDeleteZone = async (zone: Zone) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'ลบโดเมน?',
      html: `คุณต้องการลบ <strong>${zone.domain}</strong> หรือไม่?<br><span class="text-red-400">การดำเนินการนี้ไม่สามารถย้อนกลับได้</span>`,
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/zones?id=${zone.id}`, {
          method: 'DELETE'
        });

        const data = await res.json();

        if (res.ok) {
          Swal.fire({
            icon: 'success',
            title: 'ลบสำเร็จ',
            text: `ลบ ${zone.domain} เรียบร้อยแล้ว`
          });
          fetchZones();
        } else {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: data.error
          });
        }
      } catch {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'
        });
      }
    }
  };

  const filteredZones = zones.filter(zone =>
    zone.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">โดเมน / Zones</h1>
          <p className="text-slate-400">จัดการโดเมนทั้งหมดของคุณ</p>
        </div>
        <button
          onClick={handleAddZone}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-sky-500/25"
        >
          <Plus className="w-5 h-5" />
          เพิ่มโดเมน
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาโดเมน..."
            className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-sky-500"
          />
        </div>
        <button
          onClick={fetchZones}
          disabled={loading}
          className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Zones List */}
      <div className="glass rounded-2xl border border-slate-700/50 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">กำลังโหลด...</p>
          </div>
        ) : filteredZones.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-700/50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">โดเมน</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">สถานะ</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Records</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">วันที่เพิ่ม</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredZones.map((zone) => (
                  <tr key={zone.id} className="table-row-hover">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500/20 to-indigo-500/20 flex items-center justify-center">
                          <Globe className="w-5 h-5 text-sky-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{zone.domain}</p>
                          <p className="text-xs text-slate-400 font-mono">ID: {zone.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${zone.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                        {zone.status === 'active' ? '✓ Active' : '⏳ Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-400">
                        <FileText className="w-4 h-4" />
                        <span>{zone.record_count || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(zone.created_at).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/records?zone_id=${zone.id}`}
                          className="p-2 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
                          title="จัดการ Records"
                        >
                          <Server className="w-5 h-5" />
                        </Link>
                        <a
                          href={`https://${zone.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          title="เปิดเว็บไซต์"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </a>
                        <button
                          onClick={() => handleDeleteZone(zone)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="ลบโดเมน"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Globe className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">ยังไม่มีโดเมน</h3>
            <p className="text-slate-400 mb-6">เริ่มต้นด้วยการเพิ่มโดเมนแรกของคุณ</p>
            <button
              onClick={handleAddZone}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-sky-500/25"
            >
              <Plus className="w-5 h-5" />
              เพิ่มโดเมนแรก
            </button>
          </div>
        )}
      </div>

      {/* Info Box with Nameservers */}
      <div className="glass rounded-2xl p-6 border border-amber-500/30 bg-amber-500/5">
        <h3 className="font-semibold text-amber-400 mb-4">💡 วิธีการใช้งาน</h3>
        
        {/* Nameserver Info */}
        <div className="mb-4 p-4 bg-slate-900/50 rounded-xl">
          <p className="text-sm text-slate-400 mb-3">ชี้ Nameserver ของโดเมนมาที่:</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg group">
              <div className="flex items-center gap-3">
                <Server className="w-4 h-4 text-sky-400" />
                <span className="font-mono text-white">{NS1}</span>
              </div>
              <button
                onClick={() => handleCopyNS(NS1)}
                className="p-2 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
                title="คัดลอก"
              >
                {copiedNS === NS1 ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg group">
              <div className="flex items-center gap-3">
                <Server className="w-4 h-4 text-sky-400" />
                <span className="font-mono text-white">{NS2}</span>
              </div>
              <button
                onClick={() => handleCopyNS(NS2)}
                className="p-2 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
                title="คัดลอก"
              >
                {copiedNS === NS2 ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Steps */}
        <ol className="text-slate-400 space-y-2 text-sm">
          <li>1. เพิ่มโดเมนที่คุณต้องการจัดการ DNS</li>
          <li>2. ไปที่ผู้ให้บริการจดโดเมน แล้วเปลี่ยน Nameserver เป็นค่าด้านบน</li>
          <li>3. รอการ propagate 24-48 ชั่วโมง</li>
          <li>4. เริ่มจัดการ DNS Records ได้เลย!</li>
        </ol>
      </div>
    </div>
  );
}