import { useEffect, useState } from 'react';
import { listSources, listUsedSources } from '../api/categories';
import type { Source } from '../types';

export function useSources(): Source[] {
  const [sources, setSources] = useState<Source[]>([]);

  useEffect(() => {
    listSources()
      .then(setSources)
      .catch(console.error);
  }, []);

  return sources;
}

export function useUsedSources(): Source[] {
  const [sources, setSources] = useState<Source[]>([]);

  useEffect(() => {
    listUsedSources()
      .then(setSources)
      .catch(console.error);
  }, []);

  return sources;
}