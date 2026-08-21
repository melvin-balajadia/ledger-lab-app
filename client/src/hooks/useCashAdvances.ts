import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteRequest, fetchJson, patchJson, postJson } from '../lib/api';
import type { CashAdvance, CashAdvanceLineInput } from '../types';
import { useCurrentProject } from './useProjectData';

export function useCreateCashAdvance() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { lines: CashAdvanceLineInput[]; document_no?: string; total_amount?: string }) => {
      if (!projectId) throw new Error('no project');
      return postJson(`/api/projects/${projectId}/cash-advances`, body);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cash-advances', projectId] }),
  });
}

export function useUpdateCashAdvance() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: Partial<CashAdvanceLineInput> & {
      id: number;
      liquidated_amount?: string;
      status?: string;
      liquidation_control_no?: string;
      needs_review?: 0 | 1;
    }) => {
      if (!projectId) throw new Error('no project');
      return patchJson(`/api/projects/${projectId}/cash-advances/${id}`, body);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cash-advances', projectId] }),
  });
}

// "Delete" voids -- the row disappears from every list/total exactly like
// removing it from the spreadsheet, but stays restorable from the
// "Deleted items" view (see useVoidedCashAdvances).
export function useVoidCashAdvance() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => {
      if (!projectId) throw new Error('no project');
      return deleteRequest(`/api/projects/${projectId}/cash-advances/${id}`, reason ? { reason } : undefined);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cash-advances', projectId] }),
  });
}

export function useRestoreCashAdvance() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => {
      if (!projectId) throw new Error('no project');
      return postJson(`/api/projects/${projectId}/cash-advances/${id}/restore`, {});
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cash-advances', projectId] }),
  });
}

export function useVoidedCashAdvances(enabled: boolean) {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['cash-advances', projectId, 'voided'],
    queryFn: () =>
      fetchJson<{ rows: CashAdvance[] }>(`/api/projects/${projectId}/cash-advances?voided=1&pageSize=200`),
    enabled: enabled && projectId !== undefined,
  });
}
