import type { Category, CategoryListResponse, Source, Subcategory } from '../types';
import client from './client';

export async function listCategories(ledgerId?: number): Promise<CategoryListResponse> {
  const resp = await client.get<CategoryListResponse>('/categories', {
    params: ledgerId != null ? { ledger_id: ledgerId } : {},
  });
  return resp.data;
}

export async function createCategory(data: { name: string; icon?: string | null }): Promise<Category> {
  const resp = await client.post<Category>('/categories', data);
  return resp.data;
}

export async function updateCategory(id: number, data: { name?: string; icon?: string | null }): Promise<Category> {
  const resp = await client.patch<Category>(`/categories/${id}`, data);
  return resp.data;
}

export async function deleteCategory(id: number): Promise<void> {
  await client.delete(`/categories/${id}`);
}

export async function createSubcategory(
  categoryId: number,
  data: { name: string; icon?: string | null },
): Promise<Subcategory> {
  const resp = await client.post<Subcategory>(`/categories/${categoryId}/subcategories`, data);
  return resp.data;
}

export async function updateSubcategory(
  id: number,
  data: { name?: string; icon?: string | null },
): Promise<Subcategory> {
  const resp = await client.patch<Subcategory>(`/categories/subcategories/${id}`, data);
  return resp.data;
}

export async function deleteSubcategory(id: number): Promise<void> {
  await client.delete(`/categories/subcategories/${id}`);
}

export async function reorderCategories(orderedIds: number[]): Promise<void> {
  await client.post('/categories/reorder', { ordered_ids: orderedIds });
}

export async function listSources(): Promise<Source[]> {
  const resp = await client.get<{ sources: Source[] }>('/sources');
  return resp.data.sources;
}

export async function listUsedSources(): Promise<Source[]> {
  const resp = await client.get<{ sources: Source[] }>('/sources/used');
  return resp.data.sources;
}
