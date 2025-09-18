import React, { useState, useEffect } from 'react';

interface Transaction {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  type: 'paint';
  timestamp: number;
}

interface TransactionToastProps {
  transactions: Transaction[];
  onRemove: (hash: string) => void;
}

export const TransactionToast: React.FC<TransactionToastProps> = ({ transactions, onRemove }) => {
  useEffect(() => {
    transactions.forEach(tx => {
      if (tx.status === 'confirmed' || tx.status === 'failed') {
        setTimeout(() => onRemove(tx.hash), 3000);
      }
    });
  }, [transactions, onRemove]);

  if (!transactions || transactions.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 space-y-2 z-50">
      {transactions.map((tx) => {
        if (!tx || !tx.hash) return null;
        
        const shortHash = tx.hash.length > 16 ? 
          `${tx.hash.slice(0, 10)}...${tx.hash.slice(-6)}` : 
          tx.hash;

        return (
          <div
            key={tx.hash}
            className={`p-3 rounded-lg shadow-lg ${
              tx.status === 'pending' ? 'bg-yellow-100 border-yellow-400' :
              tx.status === 'confirmed' ? 'bg-green-100 border-green-400' :
              'bg-red-100 border-red-400'
            } border max-w-xs`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium">
                  {tx.status === 'pending' ? 'Painting pixel...' :
                   tx.status === 'confirmed' ? 'Pixel painted!' :
                   'Transaction failed'}
                </p>
                <p className="text-xs text-gray-600">
                  {shortHash}
                </p>
              </div>
              <button
                onClick={() => onRemove(tx.hash)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};