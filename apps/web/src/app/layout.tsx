import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import { WalletProvider } from '@/components/wallet/wallet-provider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-heading',
});

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
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${plusJakartaSans.variable} font-sans antialiased`}
      >
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
