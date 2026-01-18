import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar user={{ id: user.id, name: user.name, email: user.email }} />
      
      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
