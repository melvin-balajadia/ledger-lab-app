import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteRequest, fetchJson, patchJson, postJson } from '../lib/api';
import type { CopyRosterSource, PayrollEntry, PayrollPeriod, PayrollPeriodListResponse, PayrollWorkflowStatus } from '../types';
import { useCurrentProject } from './useProjectData';

export function usePayrollPeriod(periodId: number | null) {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['payroll-period', projectId, periodId],
    queryFn: () => fetchJson<PayrollPeriod>(`/api/projects/${projectId}/payroll-periods/${periodId}`),
    enabled: periodId != null && projectId !== undefined,
  });
}

// One period's entries is a small, naturally bounded list (however many
// workers were active that week) -- fetched once and paginated/sorted
// client-side via clientPaginate, not a new server endpoint.
export function usePayrollEntries(periodId: number | null) {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['payroll-entries', projectId, periodId],
    queryFn: () => fetchJson<PayrollEntry[]>(`/api/projects/${projectId}/payroll-periods/${periodId}/entries`),
    enabled: periodId != null && projectId !== undefined,
  });
}

// Prefill for the "+ New period" form -- next Monday-Sunday range and label,
// computed from the latest existing period. She can edit every field before
// submitting, so this is a convenience, not the source of truth.
export function useNextPeriodSuggestion(enabled: boolean) {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['payroll-next-suggestion', projectId],
    queryFn: () =>
      fetchJson<{ period_start: string; period_end: string; label: string }>(
        `/api/projects/${projectId}/payroll-periods/next-suggestion`,
      ),
    enabled: enabled && projectId !== undefined,
    staleTime: 0,
  });
}

function invalidatePeriod(queryClient: ReturnType<typeof useQueryClient>, projectId: number | undefined, periodId: number) {
  queryClient.invalidateQueries({ queryKey: ['payroll-period', projectId, periodId] });
  queryClient.invalidateQueries({ queryKey: ['payroll-entries', projectId, periodId] });
}

export function useCreatePayrollPeriod() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { label: string; period_start: string; period_end: string; total_amount?: string }) => {
      if (!projectId) throw new Error('no project');
      return postJson<PayrollPeriod>(`/api/projects/${projectId}/payroll-periods`, body);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll-next-suggestion'] }),
  });
}

export function useUpdatePayrollPeriod() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number;
      label?: string;
      period_start?: string;
      period_end?: string;
      total_amount?: string;
      status?: PayrollWorkflowStatus;
    }) => {
      if (!projectId) throw new Error('no project');
      return patchJson<PayrollPeriod>(`/api/projects/${projectId}/payroll-periods/${id}`, body);
    },
    onSuccess: (_data, variables) => invalidatePeriod(queryClient, projectId, variables.id),
  });
}

// The period the "Copy roster" button would use if clicked as-is -- lets
// the button be labeled with the actual source before she commits to it,
// instead of finding out only after a failed attempt.
export function useCopyRosterSource(periodId: number, enabled: boolean) {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['copy-roster-source', projectId, periodId],
    queryFn: () =>
      fetchJson<{ source: CopyRosterSource | null }>(
        `/api/projects/${projectId}/payroll-periods/${periodId}/copy-roster-source`,
      ),
    enabled: enabled && projectId !== undefined,
  });
}

// Candidates for the "change source period" override -- any earlier period
// that actually has a roster. Reuses the existing paginated periods list
// rather than a new endpoint; filtered to populated ones client-side.
export function useRecentPopulatedPeriods(excludePeriodId: number, beforeDate: string, enabled: boolean) {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['payroll-periods-recent', projectId, beforeDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: '1',
        pageSize: '20',
        date_to: beforeDate,
        sortKey: 'period_start',
        sortDir: 'desc',
      });
      const json = await fetchJson<PayrollPeriodListResponse>(
        `/api/projects/${projectId}/payroll-periods?${params}`,
      );
      return json.rows.filter((row) => row.entry_count > 0 && row.id !== excludePeriodId);
    },
    enabled: enabled && projectId !== undefined,
  });
}

export function useCopyRosterForward(periodId: number) {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourcePeriodId?: number) => {
      if (!projectId) throw new Error('no project');
      return postJson<{ copied_from_period_id: number; entries_copied: number; entries_skipped: number }>(
        `/api/projects/${projectId}/payroll-periods/${periodId}/copy-roster`,
        { source_period_id: sourcePeriodId },
      );
    },
    onSuccess: () => {
      invalidatePeriod(queryClient, projectId, periodId);
      queryClient.invalidateQueries({ queryKey: ['copy-roster-source', projectId, periodId] });
    },
  });
}

export function useCreatePayrollEntry(periodId: number) {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { worker_id: number; planning_line_id?: number | null; budget_item_id?: number | null; amount: string }) => {
      if (!projectId) throw new Error('no project');
      return postJson<PayrollEntry>(`/api/projects/${projectId}/payroll-periods/${periodId}/entries`, body);
    },
    onSuccess: () => invalidatePeriod(queryClient, projectId, periodId),
  });
}

export function useUpdatePayrollEntry(periodId: number) {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      entryId,
      ...body
    }: {
      entryId: number;
      planning_line_id?: number | null;
      budget_item_id?: number | null;
      amount?: string;
    }) => {
      if (!projectId) throw new Error('no project');
      return patchJson<PayrollEntry>(`/api/projects/${projectId}/payroll-periods/${periodId}/entries/${entryId}`, body);
    },
    onSuccess: () => invalidatePeriod(queryClient, projectId, periodId),
  });
}

export function useDeletePayrollEntry(periodId: number) {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: number) => {
      if (!projectId) throw new Error('no project');
      return deleteRequest(`/api/projects/${projectId}/payroll-periods/${periodId}/entries/${entryId}`);
    },
    onSuccess: () => invalidatePeriod(queryClient, projectId, periodId),
  });
}

// Recovery path for "copied from the wrong period" -- one confirmation
// instead of deleting each row individually. Fires the existing per-row
// DELETE in parallel and invalidates once at the end, rather than once per
// row (the single-entry mutation's own invalidation would otherwise refetch
// redundantly dozens of times for a large selection).
export function useDeletePayrollEntries(periodId: number) {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryIds: number[]) => {
      if (!projectId) throw new Error('no project');
      return Promise.all(
        entryIds.map((entryId) =>
          deleteRequest(`/api/projects/${projectId}/payroll-periods/${periodId}/entries/${entryId}`),
        ),
      );
    },
    onSuccess: () => invalidatePeriod(queryClient, projectId, periodId),
  });
}

// Server-side, the DELETE above voids rather than hard-deletes -- the entry
// disappears from the period's total exactly like removing it from the
// spreadsheet, but stays restorable here.
export function useVoidedPayrollEntries(periodId: number | null, enabled: boolean) {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['payroll-entries', projectId, periodId, 'voided'],
    queryFn: () =>
      fetchJson<PayrollEntry[]>(`/api/projects/${projectId}/payroll-periods/${periodId}/entries?voided=1`),
    enabled: enabled && periodId != null && projectId !== undefined,
  });
}

export function useRestorePayrollEntry(periodId: number) {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: number) => {
      if (!projectId) throw new Error('no project');
      return postJson(`/api/projects/${projectId}/payroll-periods/${periodId}/entries/${entryId}/restore`, {});
    },
    onSuccess: () => invalidatePeriod(queryClient, projectId, periodId),
  });
}
