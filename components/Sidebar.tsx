'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import {
  Globe,
  LayoutDashboard,
  Server,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  ChevronDown
} from 'lucide-react';

interface SidebarProps {
  user: {
    id: number;
    name: string;
    email: string;
  };
}

const menuItems = [
  { href: '/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
  { href: '/zones', label: 'โดเมน / Zones', icon: Server },
  { href: '/records', label: 'DNS Records', icon: FileText },
  { href: '/settings', label: 'ตั้งค่า', icon: Settings },
];

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'ออกจากระบบ?',
      text: 'คุณต้องการออกจากระบบหรือไม่?',
      showCancelButton: true,
      confirmButtonText: 'ออกจากระบบ',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      await fetch('/api/auth/me', { method: 'DELETE' });
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 z-40 transform transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-700/50">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-lg">DNS Manager</h1>
                <p className="text-xs text-slate-400">Control Panel</p>
              </div>
            </Link>
          </div>

          {/* Menu */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-sky-400' : ''}`} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-slate-700/50">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-slate-800 rounded-xl border border-slate-700 shadow-xl">
                  <Link
                    href="/settings"
                    onClick={() => {
                      setShowUserMenu(false);
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>ตั้งค่าบัญชี</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>ออกจากระบบ</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
