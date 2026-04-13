import { useState } from 'react';
import { createTransaction } from '../api/transactions';
import type { Category, TransactionCreate } from '../types';
import Modal from './Modal';
import TransactionForm from './TransactionForm';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: Category[];
  ledgerId?: number | null;
}

export default function AddTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
  ledgerId,
}: AddTransactionModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: TransactionCreate) => {
    setIsLoading(true);
    try {
      await createTransaction({ ...data, source_type: 'manual', ledger_id: ledgerId ?? null });
      onSuccess();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Transaction">
      <TransactionForm
        categories={categories}
        onSubmit={handleSubmit}
        onCancel={onClose}
        isLoading={isLoading}
      />
    </Modal>
  );
}
