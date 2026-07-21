import { useMemo, useState } from "react";
import { getShippingCost, type Province } from "../../../lib/shipping";
import { useCheckout } from "../hooks/useCheckout";
import { getCart } from "../../cart/cartStorage";
import ContactForm from "./ContactForm";
import DeliveryMethod from "./DeliveryMethod";
import ShippingAddress from "./ShippingAddress";

export default function CheckoutPage() {
  const cart = getCart();
  const [refundPolicyAccepted, setRefundPolicyAccepted] = useState(false);

  const { form, errors, isSubmitting, setIsSubmitting, updateField, validate } =
    useCheckout();

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );
  const shippingCost = getShippingCost(
    form.deliveryMethod,
    form.province as Province,
  );
  const totalBeforeTax = subtotal + shippingCost;

  async function handleCheckout() {
    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    if (!validate()) {
      return;
    }

    if (!refundPolicyAccepted) {
      alert("Please acknowledge the final-sale and non-refundable policy.");
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
          refundPolicyAccepted,
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
            <div className="rounded-xl bg-slate-100 p-6">
              <p className="font-semibold">Layer Forge</p>
              <p className="mt-2 text-slate-600">Surrey, British Columbia</p>
              <p className="mt-4 text-slate-500">
                We'll email you when your order is ready for pickup.
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
                key={`${item.id}-${item.materialId}`}
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
                  <p className="text-sm text-slate-500">{item.materialName}</p>
                  <p className="text-sm text-slate-500">Qty {item.quantity}</p>
                </div>

                <div className="text-right">
                  <div className="font-bold">
                    CAD ${(item.price * item.quantity).toFixed(2)}
                  </div>
                  <div className="text-sm text-slate-500">
                    ${item.price.toFixed(2)} each
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-3 flex justify-between">
            <span>Subtotal</span>
            <span>CAD ${subtotal.toFixed(2)}</span>
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
            <span>Taxes</span>
            <span className="text-right text-slate-500">
              Calculated at secure checkout
            </span>
          </div>

          <div className="mb-3 flex justify-between">
            <span>Delivery Method</span>
            <span className="text-slate-500">
              {form.deliveryMethod === "pickup"
                ? "Local Pickup"
                : "Ship to Address"}
            </span>
          </div>

          <hr className="my-6" />

          <div className="flex justify-between text-2xl font-bold">
            <span>Total before tax</span>
            <span>CAD ${totalBeforeTax.toFixed(2)}</span>
          </div>

          <p className="mt-4 text-sm text-slate-500 leading-6">
            Shipping is based on the province selected in your delivery address.
            Applicable taxes are calculated securely in Stripe Checkout using
            that same address.
          </p>

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-yellow-400 bg-yellow-50 p-4 text-sm leading-6 text-slate-800">
            <input
              id="refund-policy-accepted"
              type="checkbox"
              required
              checked={refundPolicyAccepted}
              onChange={(event) =>
                setRefundPolicyAccepted(event.target.checked)
              }
              className="mt-1 h-5 w-5 shrink-0 accent-yellow-500"
            />
            <span>
              <strong className="block text-slate-950">
                Final sale — paid orders are non-refundable
              </strong>
              I understand that once payment is completed, this order is final
              and non-refundable, except where required by applicable law.
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
