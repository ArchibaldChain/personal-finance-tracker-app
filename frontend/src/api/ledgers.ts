import type { LedgerRead, User as UserRead } from '../types';
import client from './client';

export async function getDefaultLedger(userId?: number): Promise<LedgerRead> {
  const resp = await client.get<LedgerRead>('/ledgers/default', {
    params: userId != null ? { user_id: userId } : {},
  });
  return resp.data;
}

export async function listUsers(): Promise<UserRead[]> {
  const resp = await client.get<UserRead[]>('/ledgers/users');
  return resp.data;
}

export async function createUser(data: {
  display_name: string;
  email: string;
  avatar_url?: string | null;
}): Promise<UserRead> {
  const resp = await client.post<UserRead>('/ledgers/users', data);
  return resp.data;
}

export async function updateUser(
  userId: number,
  data: { display_name?: string; email?: string; avatar_url?: string | null },
): Promise<UserRead> {
  const resp = await client.patch<UserRead>(`/ledgers/users/${userId}`, data);
  return resp.data;
}

export async function deleteUser(userId: number): Promise<void> {
  await client.delete(`/ledgers/users/${userId}`);
}
