// components/Receipt.tsx
import React from 'react';

interface CartItem {
  product: {
    id: number;
    name: string;
    price: number;
  };
  quantity: number;
}

interface ReceiptProps {
  items: CartItem[];
  subtotal: number;
  discount: number;
  discountPercentage: number;
  delivery: number;
  total: number;
  orderNumber: string;
  date: Date;
}

const Receipt: React.FC<ReceiptProps> = ({
  items,
  subtotal,
  discount,
  discountPercentage,
  delivery,
  total,
  orderNumber,
  date
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Tuhanas Place</h1>
        <p className="text-gray-600">Thank you for your purchase!</p>
      </div>

      {/* Order Info */}
      <div className="border-b border-gray-200 pb-4 mb-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Order #:</span>
          <span>{orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Date:</span>
          <span>{date.toLocaleString()}</span>
        </div>
      </div>

      {/* Items */}
      <div className="mb-4">
        <h2 className="font-semibold mb-2">Items:</h2>
        {items.map((item, index) => (
          <div key={index} className="flex justify-between mb-2">
            <div>
              <span className="font-medium">{item.quantity}x </span>
              {item.product.name}
            </div>
            <div>${(item.product.price * item.quantity).toFixed(2)}</div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="border-t border-gray-200 pt-4 space-y-2">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Discount ({discountPercentage}%):</span>
          <span className="text-red-600">-${discount.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Delivery:</span>
          <span>${delivery.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-2">
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-6 pt-4 border-t border-gray-200">
        <p className="text-gray-600">Thank you for shopping with us!</p>
        <p className="text-sm text-gray-500">www.tuhanasplace.com</p>
      </div>
    </div>
  );
};

export default Receipt;