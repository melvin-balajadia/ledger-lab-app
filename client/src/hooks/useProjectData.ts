import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '../lib/api';
import type { BudgetSummaryRow, ProjectKpis } from '../types';

interface MeResponse {
  userId: string;
  email: string;
  projectId?: number;
  needsSetup?: boolean;
}

export function useCurrentProject() {
  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => fetchJson<MeResponse>('/api/me'),
  });
  return {
    projectId: data?.projectId,
    needsSetup: data?.needsSetup ?? false,
    isLoading,
  };
}

export function useProjectSummary() {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['project-summary', projectId],
    queryFn: () => fetchJson<BudgetSummaryRow[]>(`/api/projects/${projectId}/summary`),
    enabled: projectId !== undefined,
  });
}

export function useProjectKpis() {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['project-kpis', projectId],
    queryFn: () => fetchJson<ProjectKpis>(`/api/projects/${projectId}/kpis`),
    enabled: projectId !== undefined,
  });
}
