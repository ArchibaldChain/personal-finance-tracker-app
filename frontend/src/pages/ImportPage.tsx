import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteImport, listImports } from '../api/imports';
import ImportForm from '../components/ImportForm';
import ImportHistoryTable from '../components/ImportHistoryTable';
import { useApp } from '../context/AppContext';
import type { Import } from '../types';

export default function ImportPage() {
  const { ledgerId } = useApp();
  const [imports, setImports] = useState<Import[]>([]);

  const fetchImports = useCallback(async () => {
    try {
      const resp = await listImports(ledgerId ?? undefined);
      setImports(resp.items);
    } catch (err) {
      console.error(err);
    }
  }, [ledgerId]);

  useEffect(() => {
    fetchImports();
  }, [fetchImports]);

  // Poll every 3s while any import is still processing
  useEffect(() => {
    const inFlight = imports.some((imp) => imp.status === 'pending' || imp.status === 'processing');
    if (!inFlight) return;
    const timer = setTimeout(fetchImports, 3000);
    return () => clearTimeout(timer);
  }, [imports, fetchImports]);

  const handleDeleteImport = useCallback(async (id: number) => {
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
      <ImportForm onSuccess={fetchImports} ledgerId={ledgerId ?? undefined} />
      <div style={{ marginTop: 12, fontSize: 13, color: '#6b6560' }}>
        Using a bank not in the list?{' '}
        <Link to="/import/custom" style={{ color: '#c9a84c', fontWeight: 500 }}>
          Set up a custom CSV format →
        </Link>
      </div>

      <div style={{ marginTop: 32 }}>
        <h2 style={sectionTitle}>Import History</h2>
        <ImportHistoryTable imports={imports} onDelete={handleDeleteImport} />
      </div>
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: 16, fontWeight: 600, color: '#2d2116', marginBottom: 12, marginTop: 0,
};
