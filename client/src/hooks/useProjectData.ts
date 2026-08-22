import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '../lib/api';
import type { BudgetSummaryRow, ProjectKpis } from '../types';

export const DemoProjectContext = createContext<number | null>(null);

interface MeResponse {
  userId: string;
  email: string;
  projectId?: number;
  needsSetup?: boolean;
}

export function useCurrentProject() {
  const demoProjectId = useContext(DemoProjectContext);
  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => fetchJson<MeResponse>('/api/me'),
    enabled: demoProjectId === null, // never call the authenticated /api/me in demo mode
  });

  if (demoProjectId !== null) {
    return { projectId: demoProjectId, needsSetup: false, isLoading: false, isDemo: true };
  }
  return {
    projectId: data?.projectId,
    needsSetup: data?.needsSetup ?? false,
    isLoading,
    isDemo: false,
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
