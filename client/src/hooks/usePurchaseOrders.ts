import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteRequest, fetchJson, patchJson, postFormData, postJson } from '../lib/api';
import type {
  MilestoneInput,
  POAttachment,
  POPayment,
  PoPaymentType,
  PurchaseOrder,
  PurchaseOrderDetail,
  VoidedPurchaseOrder,
} from '../types';
import { useCurrentProject } from './useProjectData';

export function usePurchaseOrderDetail(poId: number | null) {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['purchase-order', projectId, poId],
    queryFn: () => fetchJson<PurchaseOrderDetail>(`/api/projects/${projectId}/purchase-orders/${poId}`),
    enabled: poId != null && projectId !== undefined,
  });
}

export interface CreatePurchaseOrderInput {
  por_no: string;
  msr_no: string;
  po_date: string;
  supplier_id: number | null;
  planning_line_id: number | null;
  item_description: string;
  ref_no: string;
  currency: string;
  contract_amount: string;
  fx_rate: string;
  remarks: string;
  milestones: MilestoneInput[];
}

export function useCreatePurchaseOrder() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePurchaseOrderInput) => {
      if (!projectId) throw new Error('no project');
      return postJson<PurchaseOrder>(`/api/projects/${projectId}/purchase-orders`, body);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] }),
  });
}

export function useUpdatePurchaseOrder() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<CreatePurchaseOrderInput> & { id: number }) => {
      if (!projectId) throw new Error('no project');
      return patchJson<PurchaseOrder>(`/api/projects/${projectId}/purchase-orders/${id}`, body);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', projectId, id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] });
    },
  });
}

export interface RecordPaymentInput {
  poId: number;
  paid_on: string;
  payment_type: PoPaymentType;
  currency: string;
  amount: string;
  fx_rate: string;
  voucher_no: string;
}

export function useRecordPayment() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, ...body }: RecordPaymentInput) => {
      if (!projectId) throw new Error('no project');
      return postJson<PurchaseOrder>(`/api/projects/${projectId}/purchase-orders/${poId}/payments`, body);
    },
    onSuccess: (_, { poId }) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', projectId, poId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] });
    },
  });
}

export function useUploadAttachment(poId: number) {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      if (!projectId) throw new Error('no project');
      const formData = new FormData();
      formData.append('file', file);
      return postFormData<POAttachment>(`/api/projects/${projectId}/purchase-orders/${poId}/attachments`, formData);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-order', projectId, poId] }),
  });
}

export function useDeleteAttachment(poId: number) {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) => {
      if (!projectId) throw new Error('no project');
      return deleteRequest(`/api/projects/${projectId}/purchase-orders/${poId}/attachments/${attachmentId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-order', projectId, poId] }),
  });
}

function invalidatePo(queryClient: ReturnType<typeof useQueryClient>, projectId: number | undefined, poId: number) {
  queryClient.invalidateQueries({ queryKey: ['purchase-order', projectId, poId] });
  queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] });
}

// "Delete" voids -- the PO disappears from every list/total exactly like
// removing a spreadsheet row, but stays restorable from "Deleted items".
export function useVoidPurchaseOrder(poId: number) {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => {
      if (!projectId) throw new Error('no project');
      return deleteRequest(`/api/projects/${projectId}/purchase-orders/${poId}`, reason ? { reason } : undefined);
    },
    onSuccess: () => invalidatePo(queryClient, projectId, poId),
  });
}

export function useRestorePurchaseOrder() {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (poId: number) => {
      if (!projectId) throw new Error('no project');
      return postJson(`/api/projects/${projectId}/purchase-orders/${poId}/restore`, {});
    },
    onSuccess: (_, poId) => invalidatePo(queryClient, projectId, poId),
  });
}

export function useVoidedPurchaseOrders(enabled: boolean) {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['purchase-orders', projectId, 'voided'],
    queryFn: () => fetchJson<VoidedPurchaseOrder[]>(`/api/projects/${projectId}/purchase-orders/voided`),
    enabled: enabled && projectId !== undefined,
  });
}

export function useVoidPoPayment(poId: number) {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: number; reason?: string }) => {
      if (!projectId) throw new Error('no project');
      return deleteRequest(
        `/api/projects/${projectId}/purchase-orders/${poId}/payments/${paymentId}`,
        reason ? { reason } : undefined,
      );
    },
    onSuccess: () => invalidatePo(queryClient, projectId, poId),
  });
}

export function useRestorePoPayment(poId: number) {
  const { projectId } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: number) => {
      if (!projectId) throw new Error('no project');
      return postJson(`/api/projects/${projectId}/purchase-orders/${poId}/payments/${paymentId}/restore`, {});
    },
    onSuccess: () => invalidatePo(queryClient, projectId, poId),
  });
}

export function useVoidedPoPayments(poId: number, enabled: boolean) {
  const { projectId } = useCurrentProject();
  return useQuery({
    queryKey: ['purchase-order', projectId, poId, 'voided-payments'],
    queryFn: () => fetchJson<POPayment[]>(`/api/projects/${projectId}/purchase-orders/${poId}/payments/voided`),
    enabled: enabled && projectId !== undefined,
  });
}
