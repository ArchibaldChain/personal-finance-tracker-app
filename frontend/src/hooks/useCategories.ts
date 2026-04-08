import { useEffect, useState } from 'react';
import { listCategories } from '../api/categories';
import { useApp } from '../context/AppContext';
import type { Category } from '../types';

export function useCategories() {
  const { ledgerId } = useApp();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    listCategories(ledgerId ?? undefined)
      .then((resp) => setCategories(resp.categories))
      .catch(console.error);
  }, [ledgerId]);

  return categories;
}
