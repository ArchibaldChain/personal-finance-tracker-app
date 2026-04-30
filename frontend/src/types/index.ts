export interface User {
  id: number;
  display_name: string;
  email: string;
  avatar_url: string | null;
}

export interface LedgerRead {
  id: number;
  name: string;
  base_currency: string;
  is_default: boolean;
  owner: User;
}

export interface FailedRow {
  row_index: number;
  raw_data: Record<string, string>;
  error: string;
}

export interface Import {
  id: number;
  source_name: string;
  source_display_name: string;
  file_name: string;
  uploaded_at: string;
  status: string;
  total_rows: number | null;
  parsed_rows: number;
  failed_rows: number;
  ledger_id: number | null;
  uploaded_by_user_id: number | null;
}

export interface ImportListResponse {
  items: Import[];
  total: number;
}

export interface Transaction {
  id: number;
  import_id: number | null;
  ledger_id: number | null;
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
  source_type: string;
  source_name: string | null;
  external_id: string | null;
  transaction_date: string;
  posted_date: string | null;
  amount: number;
  currency: string;
  merchant_raw: string | null;
  merchant_normalized: string | null;
  description: string | null;
  transaction_type: string | null;
  category: string | null;
  subcategory: string | null;
  classification_confidence: number | null;
  notes: string | null;
  is_deleted: boolean;
  is_duplicate: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransactionCreate {
  transaction_date: string;
  amount: number;
  currency?: string;
  merchant_normalized?: string | null;
  description?: string | null;
  transaction_type?: string | null;
  category?: string | null;
  subcategory?: string | null;
  notes?: string | null;
  source_type?: 'csv' | 'manual';
  source_name?: string | null;
  ledger_id?: number | null;
}

export type TransactionUpdate = Partial<TransactionCreate>;

export interface TransactionListResponse {
  items: Transaction[];
  total: number;
  page: number;
  page_size: number;
}

export interface TransactionFilters {
  search?: string;
  category?: string;
  source_type?: string;
  needs_review?: boolean;
  is_duplicate?: boolean;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
  date_from?: string;
  date_to?: string;
  ledger_id?: number;
}

export interface Subcategory {
  id: number;
  name: string;
  icon: string | null;
}

export interface Category {
  id: number;
  name: string;
  icon: string | null;
  transaction_type: string | null;
  ledger_id: number | null;
  subcategories: Subcategory[];
}

export interface CategoryListResponse {
  categories: Category[];
}

export interface Source {
  key: string;
  display_name: string;
  is_custom?: boolean;
}

// Custom parser types

export interface CustomParserConfig {
  id: number;
  name: string;
  skip_rows: number;
  column_mapping_json: string;
  date_format: string;
  currency: string;
  account_type: 'debit' | 'credit' | 'investment';
  column_signature: string | null;
  ledger_id: number | null;
  created_by_user_id: number | null;
  created_at: string;
  updated_at: string;
}

export type ParsedRowField =
  | 'transaction_date'
  | 'amount'
  | 'description'
  | 'merchant_raw'
  | 'posted_date'
  | 'notes'
  | 'ignore';

export interface PreviewRow {
  row_index: number;
  raw: Record<string, string>;
  parsed: Record<string, string | null> | null;
  error: string | null;
}

export interface PreviewResponse {
  rows: PreviewRow[];
  total_rows: number;
}

export interface DetectResponse {
  match: CustomParserConfig | null;
  headers: string[];
  preview_rows: Record<string, string>[];
}

export interface CustomParserCreatePayload {
  name: string;
  skip_rows: number;
  column_mapping: Record<string, string>;
  date_format: string;
  currency: string;
  account_type: 'debit' | 'credit' | 'investment';
  csv_headers: string[];
  ledger_id: number | null;
}
