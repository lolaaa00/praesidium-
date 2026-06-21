import type { Metadata } from 'next';
import { WalletProvider } from '@/components/wallet/wallet-provider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Praesidium — AI Agent Policy Compliance Gate',
    template: '%s | Praesidium',
  },
  description:
    'A decentralized compliance firewall for AI agents — validating policy adherence, user intent, and safety through consensus before autonomous actions are executed.',
  keywords: [
    'AI compliance',
    'agent governance',
    'policy enforcement',
    'blockchain consensus',
    'GenLayer',
  ],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
