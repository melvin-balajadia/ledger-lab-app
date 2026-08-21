import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJson, patchJson, postJson } from '../lib/api';
import type { BudgetItemDetail, BudgetItemInput, BudgetItemPatch, RevisionInput } from '../types';
import { useCurrentProject } from './useProjectData';

// A budget figure feeds the Overview's KPI cards, its budget table and the
// over-budget alerts, none of which are keyed on the item being edited -- so
// invalidating only ['budget-item'] left every one of them showing the old
// number until a manual refresh.
function invalidateBudget(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: number | undefined,
  budgetItemId?: number,
) {
  if (budgetItemId !== undefined) {
    queryClient.invalidateQueries({ queryKey: ['budget-item', projectId, budgetItemId] });
  }
  queryClient.invalidateQueries({ queryKey: ['project-summary', projectId] });
  queryClient.invalidateQueries({ queryKey: ['project-kpis', projectId] });
  queryClient.invalidateQueries({ queryKey: ['alerts', projectId] });
}

export function useBudgetItemDetail(budgetItemId: number) {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['budget-item', projectId, budgetItemId],
    queryFn: () => fetchJson<BudgetItemDetail>(`/api/projects/${projectId}/budget-items/${budgetItemId}`),
    enabled: projectId !== undefined,
  });
}

export function useCreateBudgetItem() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BudgetItemInput) => {
      if (!projectId) throw new Error('no project');
      return postJson<BudgetItemDetail>(`/api/projects/${projectId}/budget-items`, body);
    },
    onSuccess: () => {
      invalidateBudget(queryClient, projectId);
      // Creating an item re-points any JPL code whose first segment names it
      // (server-side relink), which changes the WBS tree's grouping.
      queryClient.invalidateQueries({ queryKey: ['planning-lines'] });
      queryClient.invalidateQueries({ queryKey: ['wbs'] });
    },
  });
}

export function useRecordRevision(budgetItemId: number) {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RevisionInput) => {
      if (!projectId) throw new Error('no project');
      return postJson<BudgetItemDetail>(`/api/projects/${projectId}/budget-items/${budgetItemId}/revisions`, body);
    },
    onSuccess: () => invalidateBudget(queryClient, projectId, budgetItemId),
  });
}

export function useUpdateBudgetItem(budgetItemId: number) {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BudgetItemPatch) => {
      if (!projectId) throw new Error('no project');
      return patchJson<BudgetItemDetail>(`/api/projects/${projectId}/budget-items/${budgetItemId}`, body);
    },
    onSuccess: () => invalidateBudget(queryClient, projectId, budgetItemId),
  });
}
