'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X,
  ArrowLeft,
  Globe,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import Swal from 'sweetalert2';

interface Record {
  id: number;
  zone_id: number;
  name: string;
  type: string;
  content: string;
  ttl: number;
  priority: number | null;
  disabled: boolean;
}

interface Zone {
  id: number;
  domain: string;
  status: string;
}

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA', 'PTR'];

export default function RecordsPage() {
  const searchParams = useSearchParams();
  const zoneId = searchParams.get('zone_id');
  
  const [zone, setZone] = useState<Zone | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [newRecord, setNewRecord] = useState({
    name: '',
    type: 'A',
    content: '',
    ttl: 3600,
    priority: ''
  });

  const [editRecord, setEditRecord] = useState({
    content: '',
    ttl: 3600,
    priority: ''
  });

  useEffect(() => {
    if (zoneId) {
      fetchRecords();
    }
  }, [zoneId]);

  const fetchRecords = async () => {
    try {
      const res = await fetch(`/api/records?zone_id=${zoneId}`);
      const data = await res.json();
      if (res.ok) {
        setZone(data.zone);
        setRecords(data.records);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone_id: zoneId,
          ...newRecord,
          priority: newRecord.priority ? parseInt(newRecord.priority) : null
        })
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ!',
          text: data.message,
          timer: 1500,
          showConfirmButton: false
        });
        setShowAddForm(false);
        setNewRecord({ name: '', type: 'A', content: '', ttl: 3600, priority: '' });
        fetchRecords();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: data.error
        });
      }
    } catch (error) {
      console.error('Add error:', error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถเพิ่ม Record ได้'
      });
    }
  };

  const handleUpdateRecord = async (id: number) => {
    try {
      const res = await fetch('/api/records', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          content: editRecord.content,
          ttl: editRecord.ttl,
          priority: editRecord.priority ? parseInt(editRecord.priority) : null
        })
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ!',
          text: data.message,
          timer: 1500,
          showConfirmButton: false
        });
        setEditingId(null);
        fetchRecords();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: data.error
        });
      }
    } catch (error) {
      console.error('Update error:', error);
    }
  };

  const handleDeleteRecord = async (id: number, name: string) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      text: `คุณต้องการลบ Record "${name}" หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/records?id=${id}`, {
          method: 'DELETE'
        });

        const data = await res.json();

        if (res.ok) {
          Swal.fire({
            icon: 'success',
            title: 'ลบสำเร็จ!',
            timer: 1500,
            showConfirmButton: false
          });
          fetchRecords();
        } else {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: data.error
          });
        }
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const startEdit = (record: Record) => {
    setEditingId(record.id);
    setEditRecord({
      content: record.content,
      ttl: record.ttl,
      priority: record.priority?.toString() || ''
    });
  };

  if (!zoneId) {
    return (
      <div className="text-center py-20">
        <Globe className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">เลือกโดเมน</h2>
        <p className="text-slate-400 mb-6">กรุณาเลือกโดเมนจากหน้า Zones</p>
        <Link 
          href="/zones"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" />
          ไปหน้า Zones
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/zones"
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <FileText className="w-7 h-7 text-sky-500" />
              DNS Records
            </h1>
            <p className="text-slate-400 mt-1">
              จัดการ Records สำหรับ <span className="text-sky-400 font-mono">{zone?.domain}</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          เพิ่ม Record
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">เพิ่ม Record ใหม่</h3>
          <form onSubmit={handleAddRecord} className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Name</label>
              <input
                type="text"
                value={newRecord.name}
                onChange={(e) => setNewRecord({ ...newRecord, name: e.target.value })}
                placeholder="@ หรือ subdomain"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Type</label>
              <select
                value={newRecord.type}
                onChange={(e) => setNewRecord({ ...newRecord, type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
              >
                {RECORD_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-400 mb-1">Content</label>
              <input
                type="text"
                value={newRecord.content}
                onChange={(e) => setNewRecord({ ...newRecord, content: e.target.value })}
                placeholder="IP หรือ Value"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">TTL</label>
              <input
                type="number"
                value={newRecord.ttl}
                onChange={(e) => setNewRecord({ ...newRecord, ttl: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            {(newRecord.type === 'MX' || newRecord.type === 'SRV') && (
              <div>
                <label className="block text-sm text-slate-400 mb-1">Priority</label>
                <input
                  type="number"
                  value={newRecord.priority}
                  onChange={(e) => setNewRecord({ ...newRecord, priority: e.target.value })}
                  placeholder="10"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            )}
            <div className="md:col-span-6 flex gap-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
              >
                <Save className="w-4 h-4" />
                บันทึก
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg text-white font-medium hover:bg-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Content</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">TTL</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Priority</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    ยังไม่มี Records
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-white">{record.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        record.type === 'A' ? 'bg-emerald-500/20 text-emerald-400' :
                        record.type === 'AAAA' ? 'bg-blue-500/20 text-blue-400' :
                        record.type === 'CNAME' ? 'bg-purple-500/20 text-purple-400' :
                        record.type === 'MX' ? 'bg-orange-500/20 text-orange-400' :
                        record.type === 'TXT' ? 'bg-yellow-500/20 text-yellow-400' :
                        record.type === 'NS' ? 'bg-pink-500/20 text-pink-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {record.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {editingId === record.id ? (
                        <input
                          type="text"
                          value={editRecord.content}
                          onChange={(e) => setEditRecord({ ...editRecord, content: e.target.value })}
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-sky-500"
                        />
                      ) : (
                        <span className="font-mono text-sm text-slate-300 break-all">{record.content}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === record.id ? (
                        <input
                          type="number"
                          value={editRecord.ttl}
                          onChange={(e) => setEditRecord({ ...editRecord, ttl: parseInt(e.target.value) })}
                          className="w-20 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-sky-500"
                        />
                      ) : (
                        <span className="text-sm text-slate-400">{record.ttl}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-400">{record.priority || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingId === record.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleUpdateRecord(record.id)}
                            className="p-1.5 text-emerald-400 hover:bg-emerald-500/20 rounded transition-colors"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 text-slate-400 hover:bg-slate-600 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(record)}
                            className="p-1.5 text-sky-400 hover:bg-sky-500/20 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(record.id, record.name)}
                            className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
