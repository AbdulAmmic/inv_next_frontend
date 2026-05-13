import { Search } from 'lucide-react';

interface ProductsFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
}

const ProductsFilters: React.FC<ProductsFiltersProps> = ({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
}) => {
  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
        <div className="relative flex-1 mb-4 md:mb-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search products..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="flex space-x-4">
          <select
            className="border border-gray-300 rounded-lg px-4 py-2"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            <option value="all">All Categories</option>
            {/* Populate with actual categories */}
            <option value="electronics">Electronics</option>
            <option value="clothing">Clothing</option>
          </select>
          <select
            className="border border-gray-300 rounded-lg px-4 py-2"
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="inStock">In Stock</option>
            <option value="outOfStock">Out of Stock</option>
            <option value="lowStock">Low Stock</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default ProductsFilters;