import { Plus } from 'lucide-react';

interface ProductsHeaderProps {
  onAddProduct: () => void;
}

const ProductsHeader: React.FC<ProductsHeaderProps> = ({ onAddProduct }) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold">Products</h1>
      <div className="flex space-x-2">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center"
          onClick={onAddProduct}
        >
          <Plus size={20} className="mr-2" />
          Add New Product
        </button>
        {/* Other buttons can be added here */}
      </div>
    </div>
  );
};

export default ProductsHeader;