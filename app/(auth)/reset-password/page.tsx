'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Swal from 'sweetalert2';
import { Globe, Lock, KeyRound, Eye, EyeOff, ArrowLeft } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'รหัสผ่านไม่ตรงกัน',
        text: 'กรุณากรอกรหัสผ่านให้ตรงกัน'
      });
      return;
    }

    if (formData.password.length < 8) {
      Swal.fire({
        icon: 'error',
        title: 'รหัสผ่านสั้นเกินไป',
        text: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: formData.password
        })
      });

      const data = await res.json();

      if (res.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'เปลี่ยนรหัสผ่านสำเร็จ',
          text: data.message,
          confirmButtonText: 'ไปหน้าเข้าสู่ระบบ'
        });
        router.push('/login');
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

  if (!token) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">ลิงก์ไม่ถูกต้อง</h2>
        <p className="text-slate-400 mb-6">
          ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          ขอลิงก์ใหม่
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* New Password */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          รหัสผ่านใหม่
        </label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full pl-12 pr-12 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 transition-all duration-200"
            placeholder="อย่างน้อย 8 ตัวอักษร"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          ยืนยันรหัสผ่านใหม่
        </label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 transition-all duration-200"
            placeholder="กรอกรหัสผ่านอีกครั้ง"
            required
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <KeyRound className="w-5 h-5" />
            เปลี่ยนรหัสผ่าน
          </>
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="glass rounded-2xl p-8 shadow-2xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mb-4 shadow-lg shadow-emerald-500/25">
          <Globe className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">ตั้งรหัสผ่านใหม่</h1>
        <p className="text-slate-400">กรอกรหัสผ่านใหม่ของคุณ</p>
      </div>

      <Suspense fallback={<div className="text-center text-slate-400">กำลังโหลด...</div>}>
        <ResetPasswordForm />
      </Suspense>

      {/* Back to Login */}
      <div className="mt-6 text-center">
        <Link 
          href="/login"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
}
