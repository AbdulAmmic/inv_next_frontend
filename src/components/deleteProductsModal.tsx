interface DeleteProductModalProps {
  product: Product;
  onClose: () => void;
  onDelete: (id: string) => void;
}

const DeleteProductModal: React.FC<DeleteProductModalProps> = ({ product, onClose, onDelete }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Delete Product</h2>
        <p>Are you sure you want to delete "{product.name}"?</p>
        <div className="flex justify-end mt-4">
          <button
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg mr-2"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="bg-red-500 text-white px-4 py-2 rounded-lg"
            onClick={() => onDelete(product.id)}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteProductModal;