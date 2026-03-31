import { useState } from 'react';
import { deleteTransaction, updateTransaction } from '../api/transactions';
import type { Category, Transaction, TransactionCreate } from '../types';
import Modal from './Modal';
import TransactionForm from './TransactionForm';

interface EditTransactionModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onSuccess: () => void;
  categories: Category[];
}

export default function EditTransactionModal({
  transaction,
  onClose,
  onSuccess,
  categories,
}: EditTransactionModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!transaction) return null;

  const handleSubmit = async (data: TransactionCreate) => {
    setIsLoading(true);
    try {
      await updateTransaction(transaction.id, data);
      onSuccess();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this transaction?')) return;
    setIsLoading(true);
    try {
      await deleteTransaction(transaction.id);
      onSuccess();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={!!transaction} onClose={onClose} title="Edit Transaction">
      <TransactionForm
        initialValues={transaction}
        categories={categories}
        onSubmit={handleSubmit}
        onCancel={onClose}
        isLoading={isLoading}
        onDelete={handleDelete}
      />
    </Modal>
  );
}
