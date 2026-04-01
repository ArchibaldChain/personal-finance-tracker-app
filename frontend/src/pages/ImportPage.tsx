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
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>Import CSV</h1>
      <ImportForm onSuccess={fetchImports} />
      <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: 32, marginBottom: 0 }}>
        Import History
      </h2>
      <ImportHistoryTable imports={imports} onDelete={handleDelete} />
    </div>
  );
}
