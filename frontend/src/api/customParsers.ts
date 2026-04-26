import type {
  CustomParserConfig,
  CustomParserCreatePayload,
  DetectResponse,
  PreviewResponse,
} from '../types';
import client from './client';

interface PreviewConfigPayload {
  skip_rows: number;
  column_mapping: Record<string, string>;
  date_format: string;
  currency: string;
  account_type: string;
}

export async function listCustomParsers(ledgerId?: number): Promise<CustomParserConfig[]> {
  const params: Record<string, number> = {};
  if (ledgerId != null) params.ledger_id = ledgerId;
  const resp = await client.get<CustomParserConfig[]>('/custom-parsers', { params });
  return resp.data;
}

export async function createCustomParser(payload: CustomParserCreatePayload): Promise<CustomParserConfig> {
  const resp = await client.post<CustomParserConfig>('/custom-parsers', payload);
  return resp.data;
}

export async function updateCustomParser(
  id: number,
  payload: Partial<CustomParserCreatePayload>,
): Promise<CustomParserConfig> {
  const resp = await client.put<CustomParserConfig>(`/custom-parsers/${id}`, payload);
  return resp.data;
}

export async function deleteCustomParser(id: number): Promise<void> {
  await client.delete(`/custom-parsers/${id}`);
}

export async function previewCustomParser(
  file: File,
  config: PreviewConfigPayload,
): Promise<PreviewResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('config', JSON.stringify(config));
  const resp = await client.post<PreviewResponse>('/custom-parsers/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return resp.data;
}

export async function detectParser(file: File, skipRows: number = 0, ledgerId?: number): Promise<DetectResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('skip_rows', String(skipRows));
  if (ledgerId != null) formData.append('ledger_id', String(ledgerId));
  const resp = await client.post<DetectResponse>('/custom-parsers/detect', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return resp.data;
}
