import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteRequest, fetchJson, patchJson, postJson } from '../lib/api';
import type { Replenishment, ReplenishmentLineInput } from '../types';
import { useCurrentProject } from './useProjectData';

export function useCreateReplenishment() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { lines: ReplenishmentLineInput[]; document_no?: string; total_amount?: string }) => {
      if (!projectId) throw new Error('no project');
      return postJson(`/api/projects/${projectId}/replenishments`, body);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['replenishments', projectId] }),
  });
}

export function useUpdateReplenishment() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<ReplenishmentLineInput> & { id: number; needs_review?: 0 | 1 }) => {
      if (!projectId) throw new Error('no project');
      return patchJson(`/api/projects/${projectId}/replenishments/${id}`, body);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['replenishments', projectId] }),
  });
}

// "Delete" voids -- the row disappears from every list/total exactly like
// removing it from the spreadsheet, but stays restorable from the
// "Deleted items" view (see useVoidedReplenishments).
export function useVoidReplenishment() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => {
      if (!projectId) throw new Error('no project');
      return deleteRequest(`/api/projects/${projectId}/replenishments/${id}`, reason ? { reason } : undefined);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['replenishments', projectId] }),
  });
}

export function useRestoreReplenishment() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => {
      if (!projectId) throw new Error('no project');
      return postJson(`/api/projects/${projectId}/replenishments/${id}/restore`, {});
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['replenishments', projectId] }),
  });
}

export function useVoidedReplenishments(enabled: boolean) {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['replenishments', projectId, 'voided'],
    queryFn: () =>
      fetchJson<{ rows: Replenishment[] }>(
        `/api/projects/${projectId}/replenishments?voided=1&pageSize=200`,
      ),
    enabled: enabled && projectId !== undefined,
  });
}
