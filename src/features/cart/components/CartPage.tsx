import { useEffect, useMemo, useState } from "react";
import {
  getCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  type CartItem,
} from "../cartStorage";
import {
  formatEstimatedReadyDate,
  formatProductionDuration,
  getOrderProductionDays,
} from "../../../lib/productionEstimate";

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);

  function refreshCart() {
    setCart(getCart());
  }

  useEffect(() => {
    refreshCart();
  }, []);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const productionDays = getOrderProductionDays(cart);
  const estimatedReadyDate = formatEstimatedReadyDate(
    new Date(),
    productionDays,
  );

  if (cart.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-12 text-center shadow">
        <h2 className="text-2xl font-bold">Your cart is empty</h2>

        <p className="mt-3 text-slate-500">
          Browse our products and add something to your cart.
        </p>

        <a
          href="/shop"
          className="mt-8 inline-block rounded-xl bg-yellow-400 px-8 py-4 font-semibold hover:bg-yellow-300"
        >
          Continue Shopping
        </a>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Cart Items */}

      <div className="space-y-6 lg:col-span-2">
        {cart.map((item) => (
          <div
            key={`${item.id}-${item.materialId}`}
            className="rounded-2xl bg-white p-6 shadow"
          >
            <div className="flex gap-6">
              {/* Product Image */}

              <div className="h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    No Image
                  </div>
                )}
              </div>

              {/* Product Info */}

              <div className="flex flex-1 flex-col">
                <h3 className="text-xl font-bold">{item.name}</h3>

                <p className="mt-1 text-slate-500">
                  Material: {item.materialName}
                </p>

                {item.productionDays ? (
                  <p className="mt-1 text-sm font-medium text-amber-700">
                    Estimated production:{" "}
                    {formatProductionDuration(item.productionDays)}
                  </p>
                ) : null}

                <p className="mt-3 text-lg font-semibold">
                  CAD ${item.price.toFixed(2)}
                </p>

                <div className="mt-5 flex items-center gap-3">
                  <button
                    onClick={() => {
                      updateQuantity(
                        item.id,
                        item.materialId,
                        Math.max(1, item.quantity - 1),
                      );
                      refreshCart();
                    }}
                    className="rounded-lg border px-3 py-1 hover:bg-slate-100"
                  >
                    −
                  </button>

                  <span className="min-w-8 text-center font-bold">
                    {item.quantity}
                  </span>

                  <button
                    onClick={() => {
                      updateQuantity(
                        item.id,
                        item.materialId,
                        item.quantity + 1,
                      );
                      refreshCart();
                    }}
                    className="rounded-lg border px-3 py-1 hover:bg-slate-100"
                  >
                    +
                  </button>

                  <button
                    onClick={() => {
                      removeFromCart(item.id, item.materialId);
                      refreshCart();
                    }}
                    className="ml-auto text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}

      <div>
        <div className="sticky top-8 rounded-2xl bg-white p-8 shadow">
          <h2 className="mb-6 text-2xl font-bold">Order Summary</h2>

          <div className="flex justify-between text-lg">
            <span>Subtotal</span>

            <span>CAD ${subtotal.toFixed(2)}</span>
          </div>

          <hr className="my-6" />

          {estimatedReadyDate ? (
            <div className="mb-6 rounded-xl border border-yellow-300 bg-yellow-50 p-4">
              <div className="text-sm font-semibold text-slate-950">
                Estimated ready date
              </div>
              <div className="mt-1 font-bold text-slate-900">
                {estimatedReadyDate}
              </div>
              <div className="mt-1 text-xs leading-5 text-slate-600">
                Based on {formatProductionDuration(productionDays)}. Shipping
                transit time is additional.
              </div>
            </div>
          ) : null}

          <div className="flex justify-between text-2xl font-bold">
            <span>Total</span>

            <span>CAD ${subtotal.toFixed(2)}</span>
          </div>

          <a
            href="/checkout"
            className="mt-8 block rounded-xl bg-yellow-400 py-4 text-center text-lg font-semibold hover:bg-yellow-300"
          >
            Proceed to Checkout
          </a>

          <button
            onClick={() => {
              clearCart();
              refreshCart();
            }}
            className="mt-4 w-full rounded-xl border py-3 hover:bg-slate-100"
          >
            Clear Cart
          </button>
        </div>
      </div>
    </div>
  );
}
