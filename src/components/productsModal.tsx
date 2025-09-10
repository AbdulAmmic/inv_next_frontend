import { useState, useEffect } from 'react';

interface ProductFormModalProps {
  product?: Product;
  onClose: () => void;
  onSave: (product: Product | Omit<Product, 'id'>) => void;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({ product, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [sku, setSku] = useState('');
  const [stockQuantity, setStockQuantity] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setCategory(product.category);
      setSku(product.sku);
      setStockQuantity(product.stockQuantity);
      setSellingPrice(product.sellingPrice);
    }
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Fill all required Product fields
    const productData: Omit<Product, 'id'> = {
      name,
      category,
      sku,
      stockQuantity,
      sellingPrice,
      unit: product?.unit || '',
      costPrice: product?.costPrice || 0,
      profitMargin: product?.profitMargin || 0,
      unitsSold: product?.unitsSold || 0,
      variants: product?.variants || 0,
      store: product?.store || '',
    };

    if (product) {
      onSave({ ...productData, id: product.id });
    } else {
      onSave(productData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{product ? 'Edit Product' : 'Add New Product'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              Product Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          {/* Other fields */}
          <div className="flex justify-end">
            <button
              type="button"
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg mr-2"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-lg"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;