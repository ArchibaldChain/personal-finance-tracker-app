import { useEffect, useState } from 'react';
import { listSources } from '../api/categories';
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