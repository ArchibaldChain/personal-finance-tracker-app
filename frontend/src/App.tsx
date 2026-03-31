import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ImportPage from './pages/ImportPage';
import TransactionsPage from './pages/TransactionsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/transactions" replace />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="import" element={<ImportPage />} />
      </Route>
    </Routes>
  );
}
