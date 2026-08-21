import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '../lib/api';
import type { WbsRow } from '../types';
import { useCurrentProject } from './useProjectData';

export function useWbs(budgetItemId: number) {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['wbs', projectId, budgetItemId],
    queryFn: () => fetchJson<WbsRow[]>(`/api/projects/${projectId}/wbs?budget_item_id=${budgetItemId}`),
    enabled: projectId !== undefined,
  });
}
