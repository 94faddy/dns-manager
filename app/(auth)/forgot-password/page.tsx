'use client';

import { useState } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { Globe, Mail, ArrowLeft, Send } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (res.ok) {
        setSent(true);
        Swal.fire({
          icon: 'success',
          title: 'ส่งอีเมล์สำเร็จ',
          text: data.message
        });
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-8 shadow-2xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 mb-4 shadow-lg shadow-amber-500/25">
          <Globe className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">ลืมรหัสผ่าน</h1>
        <p className="text-slate-400">กรอกอีเมล์เพื่อรับลิงก์รีเซ็ตรหัสผ่าน</p>
      </div>

      {sent ? (
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">ตรวจสอบอีเมล์ของคุณ</h2>
          <p className="text-slate-400 mb-6">
            เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปที่<br />
            <span className="text-sky-400">{email}</span>
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              อีเมล์
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 transition-all duration-200"
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                ส่งลิงก์รีเซ็ต
              </>
            )}
          </button>
        </form>
      )}

      {/* Back to Login */}
      {!sent && (
        <div className="mt-6 text-center">
          <Link 
            href="/login"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      )}
    </div>
  );
}
