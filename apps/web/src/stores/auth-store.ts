import { create } from 'zustand';

export interface UserSession {
  id: string;
  walletAddress: string;
  displayName: string | null;
  avatarUrl: string | null;
  memberships: Array<{
    orgId: string;
    role: string;
    organization: {
      id: string;
      name: string;
      slug: string;
      settings: Record<string, unknown>;
    } | null;
  }>;
}

interface AuthState {
  user: UserSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: UserSession | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: user !== null,
      isLoading: false,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));
