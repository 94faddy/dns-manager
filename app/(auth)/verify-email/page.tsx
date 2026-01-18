'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Globe, CheckCircle, XCircle, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token ไม่ถูกต้อง');
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage(data.message);
        } else {
          setStatus('error');
          setMessage(data.error);
        }
      } catch {
        setStatus('error');
        setMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="text-center">
      {status === 'loading' && (
        <>
          <div className="w-20 h-20 rounded-full bg-sky-500/20 flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">กำลังยืนยันอีเมล์...</h2>
          <p className="text-slate-400">กรุณารอสักครู่</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">ยืนยันอีเมล์สำเร็จ! 🎉</h2>
          <p className="text-slate-400 mb-6">{message}</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
          >
            เข้าสู่ระบบ
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">ไม่สามารถยืนยันได้</h2>
          <p className="text-slate-400 mb-6">{message}</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40"
          >
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="glass rounded-2xl p-8 shadow-2xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 mb-4 shadow-lg shadow-sky-500/25">
          <Globe className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">ยืนยันอีเมล์</h1>
      </div>

      <Suspense fallback={
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-sky-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">กำลังโหลด...</p>
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
