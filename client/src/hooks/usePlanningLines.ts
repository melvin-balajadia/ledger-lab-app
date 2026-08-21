import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJson, patchJson, postJson } from '../lib/api';
import type { PlanningLine } from '../types';
import { useCurrentProject } from './useProjectData';

export function usePlanningLines() {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['planning-lines', projectId],
    queryFn: () => fetchJson<PlanningLine[]>(`/api/projects/${projectId}/planning-lines`),
    staleTime: 5 * 60 * 1000,
    enabled: projectId !== undefined,
  });
}

function invalidatePlanningLines(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['planning-lines'] });
  queryClient.invalidateQueries({ queryKey: ['wbs'] });
}

export function useCreatePlanningLine() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { code: string; description?: string | null; budget_amount?: string | null }) => {
      if (!projectId) throw new Error('no project');
      return postJson<PlanningLine>(`/api/projects/${projectId}/planning-lines`, body);
    },
    onSuccess: () => invalidatePlanningLines(queryClient),
  });
}

export function useUpdatePlanningLine() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number;
      code?: string;
      description?: string | null;
      budget_amount?: string | null;
      is_active?: 0 | 1;
    }) => {
      if (!projectId) throw new Error('no project');
      return patchJson<PlanningLine>(`/api/projects/${projectId}/planning-lines/${id}`, body);
    },
    onSuccess: () => invalidatePlanningLines(queryClient),
  });
}
