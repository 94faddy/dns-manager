import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DNS Manager - จัดการ DNS ของคุณ',
  description: 'ระบบจัดการ DNS และ Nameserver แบบครบวงจร',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
