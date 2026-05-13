"use client";

import { motion } from "framer-motion";

interface DeleteProductModalProps {
  product: any;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export default function DeleteProductModal({
  product,
  onClose,
  onDelete,
}: DeleteProductModalProps) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Delete Product
        </h2>
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete{" "}
          <span className="font-medium text-gray-900">{product.name}</span>?
          This action cannot be undone.
        </p>

        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            onClick={() => onDelete(product.id)}
            className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}
