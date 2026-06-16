import { Metadata } from 'next';

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
      {/* Sidebar — will be implemented in Step 5 */}
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:block">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <span className="text-xs font-bold text-primary-foreground">P</span>
          </div>
          <span className="font-semibold">Praesidium</span>
        </div>
        <nav className="space-y-1 p-4">
          <p className="px-3 py-2 text-xs font-medium text-muted-foreground">
            Navigation will be wired in Step 5
          </p>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b px-6">
          <div />
          {/* Wallet status — will be implemented in Step 5 */}
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-muted" />
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
