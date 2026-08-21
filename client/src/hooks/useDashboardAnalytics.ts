import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '../lib/api';
import type { CostBreakdown, CostTrendPoint, DashboardAlert, RetentionSummary, TopSupplier, VatSummary, WeeklyBurnPoint } from '../types';
import { useCurrentProject } from './useProjectData';

export function useCostBreakdown() {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['cost-breakdown', projectId],
    queryFn: () => fetchJson<CostBreakdown>(`/api/projects/${projectId}/cost-breakdown`),
    enabled: projectId !== undefined,
  });
}

export function useCostTrend(months = 6) {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['cost-trend', projectId, months],
    queryFn: () => fetchJson<CostTrendPoint[]>(`/api/projects/${projectId}/cost-trend?months=${months}`),
    enabled: projectId !== undefined,
  });
}

export function useAlerts() {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['alerts', projectId],
    queryFn: () => fetchJson<DashboardAlert[]>(`/api/projects/${projectId}/alerts`),
    enabled: projectId !== undefined,
  });
}

export function useRetentionSummary() {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['retention', projectId],
    queryFn: () => fetchJson<RetentionSummary>(`/api/projects/${projectId}/retention`),
    enabled: projectId !== undefined,
  });
}

export function useVatSummary() {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['vat-summary', projectId],
    queryFn: () => fetchJson<VatSummary>(`/api/projects/${projectId}/vat-summary`),
    enabled: projectId !== undefined,
  });
}

export function useTopSuppliers(limit = 10) {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['top-suppliers', projectId, limit],
    queryFn: () => fetchJson<TopSupplier[]>(`/api/projects/${projectId}/top-suppliers?limit=${limit}`),
    enabled: projectId !== undefined,
  });
}

export function useWeeklyBurn(weeks = 12) {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['weekly-burn', projectId, weeks],
    queryFn: () => fetchJson<WeeklyBurnPoint[]>(`/api/projects/${projectId}/weekly-burn?weeks=${weeks}`),
    enabled: projectId !== undefined,
  });
}
