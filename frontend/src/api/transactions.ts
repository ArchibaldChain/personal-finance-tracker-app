import type {
  Transaction,
  TransactionCreate,
  TransactionFilters,
  TransactionListResponse,
  TransactionUpdate,
} from '../types';
import client from './client';

export async function listTransactions(
  filters: TransactionFilters = {}
): Promise<TransactionListResponse> {
  const params: Record<string, string | number | boolean> = {};
  if (filters.search) params.search = filters.search;
  if (filters.category) params.category = filters.category;
  if (filters.source_type) params.source_type = filters.source_type;
  if (filters.needs_review) params.needs_review = true;
  if (filters.sort_by) params.sort_by = filters.sort_by;
  if (filters.sort_dir) params.sort_dir = filters.sort_dir;
  if (filters.page) params.page = filters.page;
  if (filters.page_size) params.page_size = filters.page_size;
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  const resp = await client.get<TransactionListResponse>('/transactions', { params });
  return resp.data;
}

export interface TransactionSummary {
  total_spent: number;
  transaction_count: number;
  largest_expense: number;
}

export async function getTransactionSummary(filters: TransactionFilters = {}): Promise<TransactionSummary> {
  const params: Record<string, string | number | boolean> = {};
  if (filters.search) params.search = filters.search;
  if (filters.category) params.category = filters.category;
  if (filters.source_type) params.source_type = filters.source_type;
  if (filters.needs_review) params.needs_review = true;
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  const resp = await client.get<TransactionSummary>('/transactions/summary', { params });
  return resp.data;
}

export async function getTransaction(id: number): Promise<Transaction> {
  const resp = await client.get<Transaction>(`/transactions/${id}`);
  return resp.data;
}

export async function createTransaction(data: TransactionCreate): Promise<Transaction> {
  const resp = await client.post<Transaction>('/transactions', data);
  return resp.data;
}

export async function updateTransaction(
  id: number,
  data: TransactionUpdate
): Promise<Transaction> {
  const resp = await client.patch<Transaction>(`/transactions/${id}`, data);
  return resp.data;
}

export async function deleteTransaction(id: number): Promise<void> {
  await client.delete(`/transactions/${id}`);
}
