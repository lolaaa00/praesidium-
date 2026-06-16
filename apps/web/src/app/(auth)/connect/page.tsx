import Link from 'next/link';
import { ConnectButton } from '@/components/wallet/connect-button';

export default function ConnectWalletPage() {
  return (
    <div className="space-y-8">
      {/* Logo */}
      <div className="flex justify-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">P</span>
          </div>
          <span className="text-2xl font-bold">Praesidium</span>
        </Link>
      </div>

      {/* Card */}
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Connect Your Wallet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your browser wallet to access the compliance dashboard.
          </p>
        </div>

        <ConnectButton />

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>Supports MetaMask, Brave Wallet, and other injected wallets.</p>
          <p className="mt-1">
            By connecting, you agree to sign a message to verify ownership.
            <br />
            No transaction is sent and no gas is required.
          </p>
        </div>
      </div>
    </div>
  );
}
