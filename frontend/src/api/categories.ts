import type { CategoryListResponse } from '../types';
import client from './client';

export async function listCategories(): Promise<CategoryListResponse> {
  const resp = await client.get<CategoryListResponse>('/categories');
  return resp.data;
}

export async function listSources(): Promise<string[]> {
  const resp = await client.get<{ sources: string[] }>('/sources');
  return resp.data.sources;
}
