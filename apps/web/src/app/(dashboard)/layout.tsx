import { Metadata } from 'next';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { RealtimeProvider } from '@/components/layout/realtime-provider';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>

      {/* Mounts Supabase Realtime subscriptions — no visible UI */}
      <RealtimeProvider />
    </div>
  );
}
