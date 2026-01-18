'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { Globe, Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'เข้าสู่ระบบสำเร็จ',
          text: `ยินดีต้อนรับ ${data.user.name}`,
          timer: 1500,
          showConfirmButton: false
        });
        router.push('/dashboard');
        router.refresh();
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
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 mb-4 shadow-lg shadow-sky-500/25">
          <Globe className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">DNS Manager</h1>
        <p className="text-slate-400">เข้าสู่ระบบเพื่อจัดการ DNS ของคุณ</p>
      </div>

      {/* Form */}
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
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 transition-all duration-200"
              placeholder="your@email.com"
              required
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            รหัสผ่าน
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full pl-12 pr-12 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 transition-all duration-200"
              placeholder="••••••••"
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

        {/* Forgot Password Link */}
        <div className="flex justify-end">
          <Link 
            href="/forgot-password"
            className="text-sm text-sky-400 hover:text-sky-300 transition-colors"
          >
            ลืมรหัสผ่าน?
          </Link>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              เข้าสู่ระบบ
            </>
          )}
        </button>
      </form>

      {/* Register Link */}
      <div className="mt-6 text-center text-slate-400">
        ยังไม่มีบัญชี?{' '}
        <Link 
          href="/register"
          className="text-sky-400 hover:text-sky-300 font-medium transition-colors"
        >
          สมัครสมาชิก
        </Link>
      </div>
    </div>
  );
}
