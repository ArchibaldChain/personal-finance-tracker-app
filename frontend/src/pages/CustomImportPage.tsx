import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createCustomParser,
  detectParser,
  previewCustomParser,
} from '../api/customParsers';
import { processImport, uploadImport } from '../api/imports';
import CustomImportConfigStep from '../components/CustomImportConfigStep';
import CustomImportPreviewStep from '../components/CustomImportPreviewStep';
import CustomImportUploadStep from '../components/CustomImportUploadStep';
import { useApp } from '../context/AppContext';
import type { CustomParserConfig, PreviewRow } from '../types';

type Step = 'upload' | 'configure' | 'preview';

export default function CustomImportPage() {
  const { ledgerId } = useApp();
  const navigate = useNavigate();

  // Step state
  const [step, setStep] = useState<Step>('upload');

  // File + detection
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [matchedConfig, setMatchedConfig] = useState<CustomParserConfig | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // Config state
  const [skipRows, setSkipRows] = useState(0);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [amountMode, setAmountMode] = useState<'single' | 'split'>('single');
  const [debitColumn, setDebitColumn] = useState('');
  const [creditColumn, setCreditColumn] = useState('');
  const [dateFormat, setDateFormat] = useState('%m/%d/%Y');
  const [currency, setCurrency] = useState('CAD');
  const [accountType, setAccountType] = useState<'debit' | 'credit' | 'investment'>('debit');
  const [isPreviewing, setIsPreviewing] = useState(false);

  // Preview state
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [savedConfig, setSavedConfig] = useState<CustomParserConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyConfig = (config: CustomParserConfig) => {
    const mapping = JSON.parse(config.column_mapping_json) as Record<string, string>;
    // Invert from storage direction (field→col) to UI direction (col→field)
    const uiMapping: Record<string, string> = {};
    for (const [field, col] of Object.entries(mapping)) {
      uiMapping[col] = field;
    }
    setColumnMapping(uiMapping);
    setSkipRows(config.skip_rows);
    setAmountMode(config.amount_mode);
    setDebitColumn(config.debit_column ?? '');
    setCreditColumn(config.credit_column ?? '');
    setDateFormat(config.date_format);
    setCurrency(config.currency);
    setAccountType(config.account_type);
    setSavedConfig(config);
  };

  const handleFileSelected = async (f: File) => {
    setFile(f);
    setError(null);
    setIsDetecting(true);
    try {
      const result = await detectParser(f, skipRows, ledgerId ?? undefined);
      setHeaders(result.headers);
      setMatchedConfig(result.match);
      // Default: map each header to 'ignore'
      const defaultMapping: Record<string, string> = {};
      result.headers.forEach((h) => { defaultMapping[h] = 'ignore'; });
      setColumnMapping(defaultMapping);
      setStep('configure');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read file');
    } finally {
      setIsDetecting(false);
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setIsPreviewing(true);
    setError(null);
    try {
      const result = await previewCustomParser(file, {
        skip_rows: skipRows,
        column_mapping: columnMapping,
        amount_mode: amountMode,
        debit_column: debitColumn || null,
        credit_column: creditColumn || null,
        date_format: dateFormat,
        currency,
        account_type: accountType,
      });
      setPreviewRows(result.rows);
      setTotalRows(result.total_rows);
      setStep('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview failed');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSave = async (name: string) => {
    if (!name.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        skip_rows: skipRows,
        column_mapping: columnMapping,
        amount_mode: amountMode,
        debit_column: debitColumn || null,
        credit_column: creditColumn || null,
        date_format: dateFormat,
        currency,
        account_type: accountType,
        csv_headers: headers,
        ledger_id: ledgerId,
      };
      const config = await createCustomParser(payload);
      setSavedConfig(config);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImport = async () => {
    if (!file || !savedConfig) return;
    setIsImporting(true);
    setError(null);
    try {
      const importRecord = await uploadImport(file, `custom_${savedConfig.id}`, ledgerId ?? undefined);
      const processed = await processImport(importRecord.id);
      setImportResult(
        `Import complete: ${processed.parsed_rows} rows imported${processed.failed_rows > 0 ? `, ${processed.failed_rows} failed` : ''}.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.titleRow}>
        <button onClick={() => navigate('/import')} style={styles.backLink}>← Back to Import</button>
        <h1 style={styles.title}>Custom CSV Import</h1>
      </div>

      {/* Step indicator */}
      <div style={styles.steps}>
        {(['upload', 'configure', 'preview'] as Step[]).map((s, i) => (
          <div key={s} style={styles.stepItem}>
            <div style={{
              ...styles.stepDot,
              background: step === s ? '#c9a84c' : i < ['upload', 'configure', 'preview'].indexOf(step) ? '#2d6a4f' : '#e8e4de',
              color: step === s || i < ['upload', 'configure', 'preview'].indexOf(step) ? '#fff' : '#9b9590',
            }}>
              {i + 1}
            </div>
            <span style={{ fontSize: 12, color: step === s ? '#2d2116' : '#9b9590', textTransform: 'capitalize' }}>{s}</span>
          </div>
        ))}
      </div>

      {error && <div style={styles.errorMsg}>{error}</div>}

      {importResult && (
        <div style={styles.successMsg}>
          {importResult}{' '}
          <button onClick={() => navigate('/transactions')} style={styles.viewLink}>View transactions →</button>
        </div>
      )}

      <div style={styles.card}>
        {step === 'upload' && (
          <CustomImportUploadStep
            onFileSelected={handleFileSelected}
            isLoading={isDetecting}
            matchedConfig={matchedConfig}
            onUseMatch={() => { if (matchedConfig) applyConfig(matchedConfig); setStep('configure'); }}
          />
        )}
        {step === 'configure' && file && (
          <CustomImportConfigStep
            headers={headers}
            columnMapping={columnMapping}
            onColumnMappingChange={setColumnMapping}
            skipRows={skipRows}
            onSkipRowsChange={setSkipRows}
            amountMode={amountMode}
            onAmountModeChange={setAmountMode}
            debitColumn={debitColumn}
            onDebitColumnChange={setDebitColumn}
            creditColumn={creditColumn}
            onCreditColumnChange={setCreditColumn}
            dateFormat={dateFormat}
            onDateFormatChange={setDateFormat}
            currency={currency}
            onCurrencyChange={setCurrency}
            accountType={accountType}
            onAccountTypeChange={setAccountType}
            onPreview={handlePreview}
            isLoading={isPreviewing}
            fileName={file.name}
          />
        )}
        {step === 'preview' && (
          <CustomImportPreviewStep
            rows={previewRows}
            totalRows={totalRows}
            onSave={handleSave}
            onImport={handleImport}
            isSaving={isSaving}
            isImporting={isImporting}
            savedConfigName={savedConfig?.name ?? null}
            onBack={() => setStep('configure')}
          />
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 860, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24 },
  titleRow: { display: 'flex', alignItems: 'center', gap: 16 },
  backLink: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 13, color: '#6b6560', padding: 0, textDecoration: 'underline',
  },
  title: { fontSize: 22, fontWeight: 700, color: '#2d2116', margin: 0 },
  steps: { display: 'flex', gap: 32, alignItems: 'center' },
  stepItem: { display: 'flex', alignItems: 'center', gap: 8 },
  stepDot: {
    width: 24, height: 24, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 600,
  },
  card: {
    background: '#fff', border: '1px solid #e8e4de', borderRadius: 8,
    padding: 28, boxShadow: '0 1px 4px rgba(45,33,22,0.06)',
  },
  errorMsg: {
    background: '#fee2e2', color: '#c0392b', padding: '9px 14px',
    borderRadius: 6, fontSize: 14, border: '1px solid #fca5a5',
  },
  successMsg: {
    background: '#f0fdf4', color: '#2d6a4f', padding: '9px 14px',
    borderRadius: 6, fontSize: 14, border: '1px solid #bbf7d0',
    display: 'flex', alignItems: 'center', gap: 12,
  },
  viewLink: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#2d6a4f', fontWeight: 600, fontSize: 13, textDecoration: 'underline',
  },
};
