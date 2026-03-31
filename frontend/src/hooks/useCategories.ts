import { useEffect, useState } from 'react';
import { listCategories } from '../api/categories';
import type { Category } from '../types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    listCategories()
      .then((resp) => setCategories(resp.categories))
      .catch(console.error);
  }, []);

  return categories;
}
