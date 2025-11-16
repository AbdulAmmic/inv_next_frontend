// components/POSSystem.tsx
import React, { useState } from 'react';
import ProductTable from './TablePos';
import Cart from './cart';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  barcode: string;
  stock: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
  status: 'pending' | 'completed' | 'held';
}

const POSSystem: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(5);
  const [heldOrders, setHeldOrders] = useState<Order[]>([]);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Sample products with barcodes
  const products: Product[] = [
    { id: 1, name: 'Coffee', price: 3.50, category: 'Beverages', barcode: '123456789', stock: 25 },
    { id: 2, name: 'Tea', price: 2.50, category: 'Beverages', barcode: '234567890', stock: 30 },
    { id: 3, name: 'Sandwich', price: 8.99, category: 'Food', barcode: '345678901', stock: 15 },
    { id: 4, name: 'Cake', price: 4.99, category: 'Dessert', barcode: '456789012', stock: 10 },
    { id: 5, name: 'Water', price: 1.50, category: 'Beverages', barcode: '567890123', stock: 40 },
    { id: 6, name: 'Salad', price: 7.99, category: 'Food', barcode: '678901234', stock: 12 },
    { id: 7, name: 'Soda', price: 2.00, category: 'Beverages', barcode: '789012345', stock: 35 },
    { id: 8, name: 'Cookie', price: 1.25, category: 'Dessert', barcode: '890123456', stock: 20 },
  ];

  const addToCart = (product: Product) => {
    if (product.stock === 0) return;
    
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    // Check if we have enough stock
    const product = products.find(p => p.id === productId);
    if (product && quantity > product.stock) {
      alert(`Only ${product.stock} items available in stock`);
      return;
    }
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleScanBarcode = () => {
    // In a real app, this would interface with a barcode scanner
    // For demo purposes, we'll simulate scanning a product
    setShowBarcodeScanner(true);
    
    // Simulate scanning after a short delay
    setTimeout(() => {
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      addToCart(randomProduct);
      setShowBarcodeScanner(false);
      alert(`Scanned: ${randomProduct.name} (${randomProduct.barcode})`);
    }, 1500);
  };

  const holdOrder = () => {
    const newOrder: Order = {
      id: Date.now().toString(),
      items: [...cart],
      subtotal: calculateSubtotal(),
      discount: calculateDiscount(),
      delivery: deliveryCharge,
      total: calculateTotal(),
      status: 'held'
    };
    setHeldOrders(prev => [...prev, newOrder]);
    setCart([]);
    setDiscountPercentage(0);
  };

  const proceedToCheckout = () => {
    // Here you would typically integrate with payment processing
    alert('Proceeding to checkout...');
    // Clear cart after checkout
    setCart([]);
    setDiscountPercentage(0);
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    return (subtotal * discountPercentage) / 100;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    return subtotal - discount + deliveryCharge;
  };

  return (
    <div className="container mx-auto p-4">
      {showBarcodeScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg text-center">
            <div className="w-64 h-64 border-4 border-dashed border-indigo-500 rounded-lg flex items-center justify-center mb-4">
              <div className="animate-pulse text-indigo-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0v1m-6-2h.01M6 16h.01M6 12h.01M12 12h.01M18 12h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-lg font-medium">Scanning barcode...</p>
            <button 
              onClick={() => setShowBarcodeScanner(false)}
              className="mt-4 text-indigo-600 hover:text-indigo-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2">
          <ProductTable
            products={products}
            cart={cart}
            onAddToCart={addToCart}
            onRemoveFromCart={removeFromCart}
            onScanBarcode={handleScanBarcode}
          />
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-1">
          <Cart
            cart={cart}
            discountPercentage={discountPercentage}
            deliveryCharge={deliveryCharge}
            onUpdateQuantity={updateQuantity}
            onRemoveFromCart={removeFromCart}
            onSetDiscount={setDiscountPercentage}
            onSetDelivery={setDeliveryCharge}
            onHoldOrder={holdOrder}
            onCheckout={proceedToCheckout}
          />
        </div>
      </div>
    </div>
  );
};

export default POSSystem;