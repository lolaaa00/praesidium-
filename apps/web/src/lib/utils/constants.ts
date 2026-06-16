// ──────────────────────────────────────────
// App-wide Constants
// ──────────────────────────────────────────

export const APP_NAME = 'Praesidium';
export const APP_DESCRIPTION =
  'A decentralized compliance firewall for AI agents — validating policy adherence, user intent, and safety through consensus before autonomous actions are executed.';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Navigation
export const DASHBOARD_NAV = [
  { label: 'Overview', href: '/overview', icon: 'LayoutDashboard' },
  { label: 'Policies', href: '/policies', icon: 'Shield' },
  { label: 'Agents', href: '/agents', icon: 'Bot' },
  { label: 'Validations', href: '/validations', icon: 'CheckCircle' },
  { label: 'Consensus', href: '/consensus', icon: 'GitBranch' },
  { label: 'Risk Analytics', href: '/risk', icon: 'BarChart3' },
  { label: 'Audit Trail', href: '/audit', icon: 'ScrollText' },
] as const;

export const ADMIN_NAV = [
  { label: 'Organization', href: '/organization', icon: 'Building2' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
  { label: 'Admin', href: '/admin', icon: 'ShieldCheck' },
] as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

// Auth
export const SIGN_MESSAGE_PREFIX = 'Sign in to Praesidium';
export const SESSION_COOKIE_NAME = 'praesidium-session';
