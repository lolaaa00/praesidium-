import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OrgState {
  currentOrgId: string | null;
  currentOrgName: string | null;
  currentOrgSlug: string | null;
  currentRole: string | null;
  setCurrentOrg: (org: {
    id: string;
    name: string;
    slug: string;
    role: string;
  }) => void;
  clearOrg: () => void;
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set) => ({
      currentOrgId: null,
      currentOrgName: null,
      currentOrgSlug: null,
      currentRole: null,

      setCurrentOrg: ({ id, name, slug, role }) =>
        set({
          currentOrgId: id,
          currentOrgName: name,
          currentOrgSlug: slug,
          currentRole: role,
        }),

      clearOrg: () =>
        set({
          currentOrgId: null,
          currentOrgName: null,
          currentOrgSlug: null,
          currentRole: null,
        }),
    }),
    {
      name: 'praesidium-org',
    },
  ),
);
