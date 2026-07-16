import { useMemo, useState } from "react";
import { useCheckout } from "../hooks/useCheckout";
import { getCart } from "../../cart/cartStorage";
import ContactForm from "./ContactForm";
import DeliveryMethod from "./DeliveryMethod";
import ShippingAddress from "./ShippingAddress";


export default function CheckoutPage() {
  const cart = getCart();


const {
  form,
  errors,
  updateField,
  validate,
} = useCheckout();

 const subtotal = useMemo(
  () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
  [cart]
);

 
async function handleCheckout() {
  if (cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }

  if (!validate()) {
    return;
  }

  try {
    const response = await fetch(
      "/api/create-checkout-session",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
  items: cart,
  customer: form,
}),
      }
    );

 if (!response.ok) {
  throw new Error("Unable to create checkout session.");
}

const data = await response.json();

if (!data.url) {
  throw new Error("Checkout session did not return a URL.");
}

    window.location.href = data.url;

  } catch (err) {

    console.error(err);

    alert("Checkout failed.");

  }
}
  return (
    <div className="grid gap-10 lg:grid-cols-3">

      <div className="space-y-8 lg:col-span-2">

        <ContactForm
            form={form}
            errors={errors}
            updateField={updateField}
            />

<DeliveryMethod
  deliveryMethod={form.deliveryMethod}
  setDeliveryMethod={(method) =>
    updateField("deliveryMethod", method)
  }
/>

      {form.deliveryMethod === "shipping" && (
  <ShippingAddress
    form={form}
    errors={errors}
    updateField={updateField}
  />
)}

        {form.deliveryMethod==="pickup" && (
          <div className="rounded-2xl bg-white p-8 shadow">
            <h2 className="mb-6 text-2xl font-bold">Pickup Information</h2>
            <div className="rounded-xl bg-slate-100 p-6">
              <p className="font-semibold">Layer Forge</p>
              <p className="mt-2 text-slate-600">Surrey, British Columbia</p>
                            <p className="mt-4 text-slate-500">We'll email you when your order is ready for pickup.</p>
            </div>
          </div>
        )}

      </div>

      <div>
        <div className="sticky top-8 rounded-2xl bg-white p-8 shadow">
          <h2 className="mb-6 text-2xl font-bold">Order Summary</h2>

          <div className="mb-6 space-y-5">
            {cart.map(item=>(
              <div key={`${item.id}-${item.materialId}`} className="flex gap-4 border-b pb-4">
                <div className="h-20 w-20 overflow-hidden rounded-lg bg-slate-100">
                  {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover"/> :
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">No Image</div>}
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  <p className="text-sm text-slate-500">{item.materialName}</p>
                  <p className="text-sm text-slate-500">Qty {item.quantity}</p>
                </div>

                <div className="text-right">
                  <div className="font-bold">CAD ${(item.price*item.quantity).toFixed(2)}</div>
                  <div className="text-sm text-slate-500">${item.price.toFixed(2)} each</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-3 flex justify-between"><span>Subtotal</span><span>CAD ${subtotal.toFixed(2)}</span></div>

 <div className="mb-3 flex justify-between">
  <span>Taxes & Shipping</span>
  <span className="text-slate-500">
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
  <span>Subtotal</span>
  <span>CAD ${subtotal.toFixed(2)}</span>
</div>

<p className="mt-4 text-sm text-slate-500 leading-6">
  Your final total, including applicable taxes and shipping, will be
  calculated securely during the next step in Stripe Checkout.
</p>

          <button
          
  onClick={handleCheckout}
  className="mt-8 w-full rounded-xl bg-yellow-400 py-4 text-lg font-semibold hover:bg-yellow-300"
>
  Continue to Secure Checkout
</button>
<p className="mt-4 text-center text-xs text-slate-500">
  Secure checkout powered by Stripe. Taxes and shipping are calculated
  based on your delivery details.
</p>

        </div>
      </div>

    </div>
  );
}
