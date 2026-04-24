import type { FailedRow, Import, ImportListResponse } from '../types';
import client from './client';

export async function uploadImport(file: File, sourceName: string, ledgerId?: number): Promise<Import> {
  const formData = new FormData();
  formData.append('source_name', sourceName);
  formData.append('file', file);
  if (ledgerId != null) formData.append('ledger_id', String(ledgerId));
  const resp = await client.post<Import>('/imports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return resp.data;
}

export async function processImport(id: number): Promise<Import> {
  const resp = await client.post<Import>(`/imports/${id}/process`);
  return resp.data;
}

export async function listImports(ledgerId?: number): Promise<ImportListResponse> {
  const params: Record<string, number> = {};
  if (ledgerId != null) params.ledger_id = ledgerId;
  const resp = await client.get<ImportListResponse>('/imports', { params });
  return resp.data;
}

export async function getImport(id: number): Promise<Import> {
  const resp = await client.get<Import>(`/imports/${id}`);
  return resp.data;
}

export async function deleteImport(id: number): Promise<void> {
  await client.delete(`/imports/${id}`);
}

export async function getFailedRows(id: number): Promise<FailedRow[]> {
  const resp = await client.get<FailedRow[]>(`/imports/${id}/failed-rows`);
  return resp.data;
}
