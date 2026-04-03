import { useCallback, useEffect, useState } from 'react';
import { deleteImport, listImports } from '../api/imports';
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

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteImport(id);
      setImports((prev) => prev.filter((imp) => imp.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete import.');
    }
  }, []);

  return (
    <div>
      <ImportForm onSuccess={fetchImports} />
      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#2d2116', marginBottom: 12, marginTop: 0 }}>
          Import History
        </h2>
        <ImportHistoryTable imports={imports} onDelete={handleDelete} />
      </div>
    </div>
  );
}
