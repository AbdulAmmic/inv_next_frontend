interface ProductsStatsProps {
  products: Product[];
}

const ProductsStats: React.FC<ProductsStatsProps> = ({ products }) => {
  const totalProducts = products.length;
  const inStock = products.filter(p => p.stockQuantity > 0).length;
  const outOfStock = products.filter(p => p.stockQuantity === 0).length;
  const lowStock = products.filter(p => p.stockQuantity < 10).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold">Total Products</h3>
        <p className="text-2xl">{totalProducts}</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold">In Stock</h3>
        <p className="text-2xl text-green-600">{inStock}</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold">Out of Stock</h3>
        <p className="text-2xl text-red-600">{outOfStock}</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold">Low Stock</h3>
        <p className="text-2xl text-yellow-600">{lowStock}</p>
      </div>
    </div>
  );
};

export default ProductsStats;