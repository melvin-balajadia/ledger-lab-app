import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteRequest, fetchJson, patchJson, postJson } from '../lib/api';
import type { AdditionalPayment, AdditionalPaymentLineInput } from '../types';
import { useCurrentProject } from './useProjectData';

export function useCreateAdditionalPayment() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { lines: AdditionalPaymentLineInput[]; document_no?: string; total_amount?: string }) => {
      if (!projectId) throw new Error('no project');
      return postJson(`/api/projects/${projectId}/additional-payments`, body);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['additional-payments', projectId] }),
  });
}

export function useUpdateAdditionalPayment() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<AdditionalPaymentLineInput> & { id: number; needs_review?: 0 | 1 }) => {
      if (!projectId) throw new Error('no project');
      return patchJson(`/api/projects/${projectId}/additional-payments/${id}`, body);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['additional-payments', projectId] }),
  });
}

// "Delete" voids -- the row disappears from every list/total exactly like
// removing it from the spreadsheet, but stays restorable from the
// "Deleted items" view (see useVoidedAdditionalPayments).
export function useVoidAdditionalPayment() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => {
      if (!projectId) throw new Error('no project');
      return deleteRequest(`/api/projects/${projectId}/additional-payments/${id}`, reason ? { reason } : undefined);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['additional-payments', projectId] }),
  });
}

export function useRestoreAdditionalPayment() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => {
      if (!projectId) throw new Error('no project');
      return postJson(`/api/projects/${projectId}/additional-payments/${id}/restore`, {});
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['additional-payments', projectId] }),
  });
}

export function useVoidedAdditionalPayments(enabled: boolean) {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['additional-payments', projectId, 'voided'],
    queryFn: () =>
      fetchJson<{ rows: AdditionalPayment[] }>(
        `/api/projects/${projectId}/additional-payments?voided=1&pageSize=200`,
      ),
    enabled: enabled && projectId !== undefined,
  });
}
