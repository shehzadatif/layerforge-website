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
import {
  calculateBulkDiscount,
  getNextBulkDiscountTier,
  type BulkDiscountConfig,
} from "../../../lib/bulkDiscount";

interface Props {
  bulkDiscountConfig: BulkDiscountConfig;
}

export default function CartPage({ bulkDiscountConfig }: Props) {
  const [cart, setCart] = useState<CartItem[]>([]);

  function refreshCart() {
    setCart(getCart());
  }

  useEffect(() => {
    refreshCart();
  }, []);

  const pricing = useMemo(
    () => calculateBulkDiscount(cart, bulkDiscountConfig),
    [cart, bulkDiscountConfig],
  );
  const nextDiscountTier = getNextBulkDiscountTier(
    pricing.eligibleQuantity,
    bulkDiscountConfig,
  );
  const bestDiscountPercentage =
    bulkDiscountConfig.tiers.at(-1)?.percentage ?? 0;

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
            key={`${item.id}-${item.variantId ?? "base"}-${item.materialId}`}
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

                {item.variantName ? (
                  <p className="mt-1 text-slate-500">
                    Variant: {item.variantName}
                  </p>
                ) : null}

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

                {item.bulkDiscountEligible ? (
                  <p className="mt-2 w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Eligible for bulk savings
                  </p>
                ) : null}

                <div className="mt-5 flex items-center gap-3">
                  <button
                    onClick={() => {
                      updateQuantity(
                        item.id,
                        item.materialId,
                        Math.max(1, item.quantity - 1),
                        item.variantId,
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
                        item.variantId,
                      );
                      refreshCart();
                    }}
                    className="rounded-lg border px-3 py-1 hover:bg-slate-100"
                  >
                    +
                  </button>

                  <button
                    onClick={() => {
                      removeFromCart(item.id, item.materialId, item.variantId);
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

          <div className="flex justify-between gap-4 text-lg">
            <span>
              Items subtotal
              <span className="ml-2 text-sm text-slate-500">
                ({pricing.totalQuantity}{" "}
                {pricing.totalQuantity === 1 ? "piece" : "pieces"})
              </span>
            </span>

            <span>CAD ${(pricing.subtotalCents / 100).toFixed(2)}</span>
          </div>

          {pricing.discountPercentage > 0 ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex justify-between gap-4 font-semibold text-emerald-800">
                <span>Bulk discount ({pricing.discountPercentage}%)</span>
                <span>− CAD ${(pricing.discountCents / 100).toFixed(2)}</span>
              </div>
              <p className="mt-1 text-sm leading-5 text-emerald-700">
                Your quantity discount has been applied automatically.
              </p>
            </div>
          ) : null}

          {pricing.eligibleQuantity > 0 &&
          pricing.eligibleQuantity < pricing.totalQuantity ? (
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {pricing.eligibleQuantity} of {pricing.totalQuantity} pieces count
              toward bulk pricing. Ineligible products remain at their regular
              price.
            </p>
          ) : null}

          {pricing.eligibleQuantity > 0 && nextDiscountTier ? (
            <p className="mt-4 rounded-xl bg-slate-100 p-4 text-sm font-medium leading-6 text-slate-700">
              Add {nextDiscountTier.quantityNeeded} more eligible{" "}
              {nextDiscountTier.quantityNeeded === 1 ? "piece" : "pieces"} to
              unlock {nextDiscountTier.percentage}% off.
            </p>
          ) : pricing.eligibleQuantity > 0 && bestDiscountPercentage > 0 ? (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
              Best bulk rate unlocked — you&apos;re saving{" "}
              {bestDiscountPercentage}% on eligible products.
            </p>
          ) : null}

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

            <span>
              CAD ${(pricing.discountedSubtotalCents / 100).toFixed(2)}
            </span>
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
