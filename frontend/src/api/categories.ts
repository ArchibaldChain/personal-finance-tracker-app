import type { CategoryListResponse, Source } from '../types';
import client from './client';

export async function listCategories(): Promise<CategoryListResponse> {
  const resp = await client.get<CategoryListResponse>('/categories');
  return resp.data;
}

export async function listSources(): Promise<Source[]> {
  const resp = await client.get<{ sources: Source[] }>('/sources');
  return resp.data.sources;
}
