import { useCallback, useEffect, useState } from 'react';
import { listImports } from '../api/imports';
import ImportForm from '../components/ImportForm';
import ImportHistoryTable from '../components/ImportHistoryTable';
import type { Import } from '../types';

export default function ImportPage() {
  const [imports, setImports] = useState<Import[]>([]);

  const fetchImports = useCallback(async () => {
    try {
      const resp = await listImports();
      setImports(resp.items);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchImports();
  }, [fetchImports]);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>Import CSV</h1>
      <ImportForm onSuccess={fetchImports} />
      <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: 32, marginBottom: 0 }}>
        Import History
      </h2>
      <ImportHistoryTable imports={imports} />
    </div>
  );
}
