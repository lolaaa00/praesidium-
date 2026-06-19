'use client';

import { useQuery } from '@tanstack/react-query';
import { orgFetch, parseResponse } from '@/lib/api/fetch';

// ──────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────

export const analyticsKeys = {
  all: ['analytics'] as const,
  compliance: (days: number) => [...analyticsKeys.all, 'compliance', days] as const,
  risk: (days: number) => [...analyticsKeys.all, 'risk', days] as const,
};

// ──────────────────────────────────────────
// Compliance Analytics
// ──────────────────────────────────────────

interface ComplianceSummary {
  total: number;
  approved: number;
  rejected: number;
  escalated: number;
  approvalRate: number;
  avgComplianceScore: number;
}

interface ComplianceTrend {
  date: string;
  total: number;
  approved: number;
  rejected: number;
  escalated: number;
  avgScore: number;
}

interface ComplianceResponse {
  summary: ComplianceSummary;
  trend: ComplianceTrend[];
  period: { days: number; since: string };
}

export function useComplianceAnalytics(days = 30) {
  return useQuery({
    queryKey: analyticsKeys.compliance(days),
    queryFn: async () => {
      const res = await orgFetch(`/api/analytics/compliance?days=${days}`);
      return parseResponse<ComplianceResponse>(res);
    },
  });
}

// ──────────────────────────────────────────
// Risk Analytics
// ──────────────────────────────────────────

interface RiskResponse {
  currentRiskScore: number | null;
  riskLevel: string | null;
  severityCounts: Record<string, number>;
  topViolatedRules: { rule: string; count: number }[];
  snapshots: { date: string; overallScore: number; details: unknown }[];
  period: { days: number; since: string };
}

export function useRiskAnalytics(days = 30) {
  return useQuery({
    queryKey: analyticsKeys.risk(days),
    queryFn: async () => {
      const res = await orgFetch(`/api/analytics/risk?days=${days}`);
      return parseResponse<RiskResponse>(res);
    },
  });
}
