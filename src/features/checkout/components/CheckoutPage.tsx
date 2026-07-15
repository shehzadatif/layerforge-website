import { useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { getCart } from "../../cart/cartStorage";
import { TAX_RATES, type Province } from "../../../lib/taxes";
import ContactForm from "./ContactForm";
import DeliveryMethod from "./DeliveryMethod";
import ShippingAddress from "./ShippingAddress";

export default function CheckoutPage() {
  const cart = getCart();
  const [province, setProvince] = useState<Province>("BC");
  const [email, setEmail] = useState("");

const {
  form,
  errors,
  updateField,
  validate,
} = useCheckout();

  const subtotal = useMemo(
    () => cart.reduce((sum,item)=>sum + item.price * item.quantity,0),
    [cart]
  );

  const rates = TAX_RATES[province];
  const shipping = 0;

  const gst = subtotal * rates.gst;
  const pst = subtotal * rates.pst;
  const hst = subtotal * rates.hst;
  const qst = subtotal * rates.qst;

  const total = subtotal + shipping + gst + pst + hst + qst;

  function validateForm() {
  const newErrors: Record<string, string> = {};

  if (!email.trim()) newErrors.email = "Email is required.";
  if (!firstName.trim()) newErrors.firstName = "First name is required.";
  if (!lastName.trim()) newErrors.lastName = "Last name is required.";
  if (!phone.trim()) newErrors.phone = "Phone number is required.";

  if (deliveryMethod === "shipping") {
    if (!address.trim()) newErrors.address = "Street address is required.";
    if (!city.trim()) newErrors.city = "City is required.";
    if (!postalCode.trim()) newErrors.postalCode = "Postal code is required.";
  }

  setErrors(newErrors);

  return Object.keys(newErrors).length === 0;
}

if (!validateForm()) {
  return;
}

  async function handleCheckout() {
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
        }),
      }
    );

    const data = await response.json();

    if (!data.url) {
      alert("Unable to start checkout.");
      return;
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
  deliveryMethod={deliveryMethod}
  setDeliveryMethod={setDeliveryMethod}
/>

      {deliveryMethod === "shipping" && (
  <ShippingAddress
    form={form}
    errors={errors}
    updateField={updateField}
  />
)}

        {deliveryMethod==="pickup" && (
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
            <span>Delivery</span>
            <span className="text-slate-500">
              {deliveryMethod==="pickup" ? "Local Pickup" : "Calculated after address"}
            </span>
          </div>

          {gst>0 && <div className="mb-3 flex justify-between"><span>GST</span><span>CAD ${gst.toFixed(2)}</span></div>}
          {pst>0 && <div className="mb-3 flex justify-between"><span>PST</span><span>CAD ${pst.toFixed(2)}</span></div>}
          {hst>0 && <div className="mb-3 flex justify-between"><span>HST</span><span>CAD ${hst.toFixed(2)}</span></div>}
          {qst>0 && <div className="mb-3 flex justify-between"><span>QST</span><span>CAD ${qst.toFixed(2)}</span></div>}

          <hr className="my-6"/>

          <div className="flex justify-between text-2xl font-bold">
            <span>Estimated Total</span>
            <span>CAD ${total.toFixed(2)}</span>
          </div>

          <button
          
  onClick={handleCheckout}
  className="mt-8 w-full rounded-xl bg-yellow-400 py-4 text-lg font-semibold hover:bg-yellow-300"
>
  Continue to Payment
</button>

        </div>
      </div>

    </div>
  );
}
