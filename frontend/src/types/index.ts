export interface Import {
  id: number;
  source_name: string;
  file_name: string;
  uploaded_at: string;
  status: string;
  total_rows: number | null;
  parsed_rows: number;
  failed_rows: number;
}

export interface ImportListResponse {
  items: Import[];
  total: number;
}

export interface Transaction {
  id: number;
  import_id: number | null;
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
  category: string | null;
  subcategory: string | null;
  classification_confidence: number | null;
  notes: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransactionCreate {
  transaction_date: string;
  amount: number;
  currency?: string;
  merchant_normalized?: string | null;
  description?: string | null;
  category?: string | null;
  subcategory?: string | null;
  notes?: string | null;
  source_type?: 'csv' | 'manual';
  source_name?: string | null;
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
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
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
  subcategories: Subcategory[];
}

export interface CategoryListResponse {
  categories: Category[];
}

export interface Source {
  key: string;
  display_name: string;
}
