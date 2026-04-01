import type { Import, ImportListResponse } from '../types';
import client from './client';

export async function uploadImport(file: File, sourceName: string): Promise<Import> {
  const formData = new FormData();
  formData.append('source_name', sourceName);
  formData.append('file', file);
  const resp = await client.post<Import>('/imports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return resp.data;
}

export async function processImport(id: number): Promise<Import> {
  const resp = await client.post<Import>(`/imports/${id}/process`);
  return resp.data;
}

export async function listImports(): Promise<ImportListResponse> {
  const resp = await client.get<ImportListResponse>('/imports');
  return resp.data;
}

export async function getImport(id: number): Promise<Import> {
  const resp = await client.get<Import>(`/imports/${id}`);
  return resp.data;
}

export async function deleteImport(id: number): Promise<void> {
  await client.delete(`/imports/${id}`);
}
