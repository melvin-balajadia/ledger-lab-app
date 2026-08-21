import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJson, patchJson, postJson } from '../lib/api';
import type { Worker, WorkerListResponse, WorkerPayrollEntriesResponse } from '../types';
import { useCurrentProject } from './useProjectData';

// Small lookup for the near-duplicate-name warning on the create/edit form --
// same non-blocking pattern as SupplierForm's name check.
export function useWorkerSearch(q: string) {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['worker-search', projectId, q],
    queryFn: () =>
      fetchJson<WorkerListResponse>(
        `/api/projects/${projectId}/workers?page=1&pageSize=5&search=${encodeURIComponent(q)}`,
      ),
    enabled: q.length >= 3 && projectId !== undefined,
    staleTime: 30 * 1000,
  });
}

// One worker's entries across every period -- bounded by the number of
// payroll periods that exist (≤1 entry per week), fetched once and
// paginated/sorted client-side via clientPaginate.
export function useWorkerPayrollEntries(workerId: number | null) {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['worker-payroll-entries', projectId, workerId],
    queryFn: () => fetchJson<WorkerPayrollEntriesResponse>(`/api/projects/${projectId}/workers/${workerId}/payroll-entries`),
    enabled: workerId != null && projectId !== undefined,
  });
}

// Distinct position values across all workers -- small, bounded set,
// fetched once and filtered client-side for the near-duplicate suggestion.
export function useWorkerPositions() {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['worker-positions', projectId],
    queryFn: () => fetchJson<{ values: string[] }>(`/api/projects/${projectId}/workers/positions`),
    staleTime: 5 * 60 * 1000,
    enabled: projectId !== undefined,
  });
}

export function useCreateWorker() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      last_name: string;
      first_name: string;
      middle_name?: string | null;
      employee_no?: string | null;
      position?: string | null;
      date_hired?: string | null;
    }) => {
      if (!projectId) throw new Error('no project');
      return postJson<Worker>(`/api/projects/${projectId}/workers`, body);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['worker-positions'] }),
  });
}

export function useUpdateWorker() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number;
      last_name?: string;
      first_name?: string;
      middle_name?: string | null;
      employee_no?: string | null;
      position?: string | null;
      date_hired?: string | null;
      is_active?: 0 | 1;
      date_separated?: string | null;
    }) => {
      if (!projectId) throw new Error('no project');
      return patchJson<Worker>(`/api/projects/${projectId}/workers/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-positions'] });
      queryClient.invalidateQueries({ queryKey: ['worker-payroll-entries'] });
    },
  });
}
