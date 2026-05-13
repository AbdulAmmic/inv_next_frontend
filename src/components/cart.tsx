// components/Cart.tsx
import React, { useState } from "react";
import CheckoutModal from "./checkoutModal";

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartProps {
  cart: CartItem[];
  discountPercentage: number;
  deliveryCharge: number;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemoveFromCart: (productId: number) => void;
  onSetDiscount: (discount: number) => void;
  onSetDelivery: (delivery: number) => void;
  onHoldOrder: () => void;
  onCheckout: () => void;
}

const Cart: React.FC<CartProps> = ({
  cart,
  discountPercentage,
  deliveryCharge,
  onUpdateQuantity,
  onRemoveFromCart,
  onSetDiscount,
  onSetDelivery,
  onHoldOrder,
  onCheckout,
}) => {
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);

  const calculateSubtotal = () => {
    return cart.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
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
    <div className="bg-white rounded-xl shadow-md p-4 h-full">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Cart</h2>

      {cart.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mx-auto text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <p className="mt-2">Your cart is empty</p>
        </div>
      ) : (
        <>
          {/* Cart Items */}
          <div className="overflow-y-auto max-h-80">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="flex justify-between items-center py-3 border-b border-gray-100"
              >
                <div className="flex-1">
                  <h4 className="font-semibold">{item.product.name}</h4>
                  <p className="text-gray-600">
                    ${item.product.price.toFixed(2)} each
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      onUpdateQuantity(item.product.id, item.quantity - 1)
                    }
                    className="bg-gray-100 hover:bg-gray-200 w-8 h-8 rounded-full flex items-center justify-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 12H4"
                      />
                    </svg>
                  </button>
                  <span className="w-8 text-center font-medium">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      onUpdateQuantity(item.product.id, item.quantity + 1)
                    }
                    className="bg-gray-100 hover:bg-gray-200 w-8 h-8 rounded-full flex items-center justify-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => onRemoveFromCart(item.product.id)}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">
                ${calculateSubtotal().toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Discount:</span>
              <div className="flex items-center">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercentage}
                  onChange={(e) => onSetDiscount(Number(e.target.value))}
                  className="w-16 text-right border border-gray-300 rounded-md px-2 py-1 mr-2"
                />
                <span>%</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Delivery:</span>
              <div className="flex items-center">
                <span className="mr-1">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={deliveryCharge}
                  onChange={(e) => onSetDelivery(Number(e.target.value))}
                  className="w-16 text-right border border-gray-300 rounded-md px-2 py-1"
                />
              </div>
            </div>

            <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-3">
              <span>Total:</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-3">
            <button
              onClick={onHoldOrder}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-lg font-medium transition-colors"
            >
              Hold Order
            </button>
            <button
              onClick={() => setCheckoutOpen(true)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium transition-colors"
            >
              Proceed to Checkout
            </button>
          </div>
        </>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setCheckoutOpen(false)}
        total={calculateTotal()}
        customers={[
          { id: 1, name: "John Doe" },
          { id: 2, name: "Jane Smith" },
        ]}
        cartItems={cart.map(item => ({
          id: item.product.id,
          name: item.product.name,
          qty: item.quantity,
          price: item.product.price,
        }))}
        shopName="Tuhanas Kitchen"
        onConfirm={(customerId, paymentType) => {
          console.log("Checkout with:", { customerId, paymentType });
          onCheckout();
        }}
      />
    </div>
  );
};

export default Cart;
