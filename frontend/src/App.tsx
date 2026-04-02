import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import CategoriesPage from './pages/CategoriesPage';
import ImportPage from './pages/ImportPage';
import TransactionsPage from './pages/TransactionsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/transactions" replace />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="categories" element={<CategoriesPage />} />
      </Route>
    </Routes>
  );
}
