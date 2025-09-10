import { Edit, Trash2 } from 'lucide-react';

interface ProductsTableProps {
  products: Product[];
  selectedProducts: string[];
  onSelectProduct: (ids: string[]) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
}

const ProductsTable: React.FC<ProductsTableProps> = ({
  products,
  selectedProducts,
  onSelectProduct,
  onEditProduct,
  onDeleteProduct,
}) => {
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onSelectProduct(products.map(p => p.id));
    } else {
      onSelectProduct([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectProduct([...selectedProducts, id]);
    } else {
      onSelectProduct(selectedProducts.filter(selectedId => selectedId !== id));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <input
                type="checkbox"
                checked={selectedProducts.length === products.length && products.length > 0}
                onChange={handleSelectAll}
              />
            </th>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Product Name
            </th>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              SKU
            </th>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Stock
            </th>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Price
            </th>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products.map((product) => (
            <tr key={product.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(product.id)}
                  onChange={(e) => handleSelectOne(product.id, e.target.checked)}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">{product.name}</td>
              <td className="px-6 py-4 whitespace-nowrap">{product.category}</td>
              <td className="px-6 py-4 whitespace-nowrap">{product.sku}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    product.stockQuantity > 10
                      ? 'bg-green-100 text-green-800'
                      : product.stockQuantity === 0
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {product.stockQuantity}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">${product.sellingPrice}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  className="text-indigo-600 hover:text-indigo-900 mr-3"
                  onClick={() => onEditProduct(product)}
                >
                  <Edit size={16} />
                </button>
                <button
                  className="text-red-600 hover:text-red-900"
                  onClick={() => onDeleteProduct(product)}
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductsTable;