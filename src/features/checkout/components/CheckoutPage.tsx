import { useMemo, useState } from "react";
import { getShippingCost, type Province } from "../../../lib/shipping";
import { useCheckout } from "../hooks/useCheckout";
import { getCart } from "../../cart/cartStorage";
import ContactForm from "./ContactForm";
import DeliveryMethod from "./DeliveryMethod";
import ShippingAddress from "./ShippingAddress";
import { PICKUP_AREA, PICKUP_AREA_SHORT } from "../pickupDetails";
import {
  formatEstimatedReadyDate,
  formatProductionDuration,
  getOrderProductionDays,
} from "../../../lib/productionEstimate";
import {
  calculateBulkDiscount,
  getDiscountedUnitPriceCents,
  type BulkDiscountConfig,
} from "../../../lib/bulkDiscount";

interface Props {
  bulkDiscountConfig: BulkDiscountConfig;
}

export default function CheckoutPage({ bulkDiscountConfig }: Props) {
  const cart = getCart();
  const [termsAccepted, setTermsAccepted] = useState(false);

  const { form, errors, isSubmitting, setIsSubmitting, updateField, validate } =
    useCheckout();

  const pricing = useMemo(
    () => calculateBulkDiscount(cart, bulkDiscountConfig),
    [cart, bulkDiscountConfig],
  );
  const shippingCost = getShippingCost(
    form.deliveryMethod,
    form.province as Province,
  );
  const totalBeforeTax = pricing.discountedSubtotalCents / 100 + shippingCost;
  const productionDays = getOrderProductionDays(cart);
  const estimatedReadyDate = formatEstimatedReadyDate(
    new Date(),
    productionDays,
  );

  async function handleCheckout() {
    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    if (!validate()) {
      return;
    }

    if (!termsAccepted) {
      alert("Please review and accept the Terms & Policies.");
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cart,
          customer: form,
          termsAccepted,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to create checkout session.");
      }

      if (!data.url) {
        throw new Error("Checkout session did not return a URL.");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error(err);

      alert(err instanceof Error ? err.message : "Checkout failed.");

      setIsSubmitting(false);
    }
  }
  return (
    <form
      autoComplete="off"
      className="grid gap-10 lg:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault();
        void handleCheckout();
      }}
    >
      <div className="space-y-8 lg:col-span-2">
        <ContactForm form={form} errors={errors} updateField={updateField} />

        <DeliveryMethod
          deliveryMethod={form.deliveryMethod}
          setDeliveryMethod={(method) => updateField("deliveryMethod", method)}
        />

        {form.deliveryMethod === "shipping" && (
          <ShippingAddress
            form={form}
            errors={errors}
            updateField={updateField}
          />
        )}

        {form.deliveryMethod === "pickup" && (
          <div className="rounded-2xl bg-white p-8 shadow">
            <h2 className="mb-6 text-2xl font-bold">Pickup Information</h2>
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-yellow-700">
                Approximate pickup area
              </p>
              <p className="mt-2 text-xl font-bold text-slate-950">
                {PICKUP_AREA}
              </p>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Layer Forge Canada is a home-based production studio. For
                privacy, we&apos;ll email the exact pickup address and
                instructions when your order is ready.
              </p>
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="sticky top-8 rounded-2xl bg-white p-8 shadow">
          <h2 className="mb-6 text-2xl font-bold">Order Summary</h2>

          <div className="mb-6 space-y-5">
            {cart.map((item) => (
              <div
                key={`${item.id}-${item.variantId ?? "base"}-${item.materialId}`}
                className="flex gap-4 border-b pb-4"
              >
                <div className="h-20 w-20 overflow-hidden rounded-lg bg-slate-100">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">
                      No Image
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  {item.variantName ? (
                    <p className="text-sm text-slate-500">
                      Variant: {item.variantName}
                    </p>
                  ) : null}
                  <p className="text-sm text-slate-500">{item.materialName}</p>
                  <p className="text-sm text-slate-500">Qty {item.quantity}</p>
                </div>

                <div className="text-right">
                  <div className="font-bold">
                    CAD $
                    {(
                      (getDiscountedUnitPriceCents(
                        Math.round(item.price * 100),
                        item.bulkDiscountEligible
                          ? pricing.discountPercentage
                          : 0,
                      ) *
                        item.quantity) /
                      100
                    ).toFixed(2)}
                  </div>
                  <div className="text-sm text-slate-500">
                    $
                    {(
                      getDiscountedUnitPriceCents(
                        Math.round(item.price * 100),
                        item.bulkDiscountEligible
                          ? pricing.discountPercentage
                          : 0,
                      ) / 100
                    ).toFixed(2)}{" "}
                    each
                  </div>
                  {pricing.discountPercentage > 0 &&
                  item.bulkDiscountEligible ? (
                    <div className="text-xs text-slate-400 line-through">
                      CAD ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  ) : null}
                  {item.productionDays ? (
                    <div className="mt-1 text-xs font-medium text-amber-700">
                      {formatProductionDuration(item.productionDays)} production
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="mb-3 flex justify-between gap-4">
            <span>
              Items subtotal ({pricing.totalQuantity}{" "}
              {pricing.totalQuantity === 1 ? "piece" : "pieces"})
            </span>
            <span>CAD ${(pricing.subtotalCents / 100).toFixed(2)}</span>
          </div>

          {pricing.discountPercentage > 0 ? (
            <div className="mb-3 flex justify-between gap-4 font-semibold text-emerald-700">
              <span>Bulk discount ({pricing.discountPercentage}%)</span>
              <span>− CAD ${(pricing.discountCents / 100).toFixed(2)}</span>
            </div>
          ) : null}

          {pricing.eligibleQuantity > 0 &&
          pricing.eligibleQuantity < pricing.totalQuantity ? (
            <p className="mb-3 text-xs leading-5 text-slate-500">
              Discount applies to {pricing.eligibleQuantity} eligible pieces;
              other products remain at their regular price.
            </p>
          ) : null}

          <div className="mb-3 flex justify-between gap-4 font-semibold">
            <span>Merchandise total</span>
            <span>
              CAD ${(pricing.discountedSubtotalCents / 100).toFixed(2)}
            </span>
          </div>

          <div className="mb-3 flex justify-between gap-4">
            <span>Shipping</span>
            <span className="text-right text-slate-500">
              {form.deliveryMethod === "pickup"
                ? "Free"
                : `CAD $${shippingCost.toFixed(2)} (${form.province})`}
            </span>
          </div>

          <div className="mb-3 flex justify-between gap-4">
            <span>PST (7%)</span>
            <span className="text-right text-slate-500">
              Calculated at secure checkout for BC orders
            </span>
          </div>

          <div className="mb-3 flex justify-between gap-4">
            <span>Delivery Method</span>
            <span className="text-right text-slate-500">
              {form.deliveryMethod === "pickup"
                ? `Local Pickup — ${PICKUP_AREA_SHORT}`
                : "Ship to Address"}
            </span>
          </div>

          <hr className="my-6" />

          {estimatedReadyDate ? (
            <div className="mb-6 rounded-xl border border-yellow-300 bg-yellow-50 p-4">
              <div className="text-sm font-semibold text-slate-950">
                {form.deliveryMethod === "pickup"
                  ? "Estimated ready for pickup"
                  : "Estimated ready to ship"}
              </div>
              <div className="mt-1 font-bold text-slate-900">
                {estimatedReadyDate}
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Based on {formatProductionDuration(productionDays)} after
                payment. Carrier transit time is additional for shipped orders.
              </p>
            </div>
          ) : null}

          <div className="flex justify-between text-2xl font-bold">
            <span>Total before PST</span>
            <span>CAD ${totalBeforeTax.toFixed(2)}</span>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-500">
            {form.deliveryMethod === "pickup"
              ? `Pickup is free in ${PICKUP_AREA_SHORT}. We'll email the exact address and instructions when your order is ready. BC PST (7%) is calculated securely in Stripe Checkout.`
              : "Shipping is based on the province selected in your delivery address. BC PST (7%) is calculated securely in Stripe Checkout for orders taxable in British Columbia."}
          </p>

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-yellow-400 bg-yellow-50 p-4 text-sm leading-6 text-slate-800">
            <input
              id="terms-accepted"
              type="checkbox"
              required
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-yellow-500"
            />
            <span>
              <strong className="block text-slate-950">
                Final sale — paid orders are non-refundable
              </strong>
              I have reviewed and agree to Layer Forge Canada&apos;s{" "}
              <a
                href="/terms"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-slate-950 underline decoration-yellow-500 decoration-2 underline-offset-2"
              >
                Terms &amp; Policies
              </a>
              , including that once payment is completed, this order is final
              and non-refundable except where required by applicable law.
            </span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-5 w-full rounded-xl bg-yellow-400 py-4 text-lg font-semibold hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Preparing Secure Checkout..."
              : "Continue to Secure Checkout"}
          </button>
          <p className="mt-4 text-center text-xs text-slate-500">
            Secure checkout powered by Stripe. Your shipping address is entered
            once and carried securely into payment.
          </p>
        </div>
      </div>
    </form>
  );
}
