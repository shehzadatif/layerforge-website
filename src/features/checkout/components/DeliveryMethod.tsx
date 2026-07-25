import type { DeliveryMethod as DeliveryMethodType } from "../types";
import {
  PICKUP_AREA,
  PICKUP_MAP_EMBED_URL,
  PICKUP_MAP_URL,
} from "../pickupDetails";

interface Props {
  deliveryMethod: DeliveryMethodType;
  setDeliveryMethod: (method: DeliveryMethodType) => void;
}

export default function DeliveryMethod({
  deliveryMethod,
  setDeliveryMethod,
}: Props) {
  return (
    <div className="rounded-2xl bg-white p-8 shadow">
      <h2 className="mb-6 text-2xl font-bold">Delivery Method</h2>

      <div className="space-y-4">
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-4 hover:border-yellow-400">
          <input
            type="radio"
            checked={deliveryMethod === "shipping"}
            onChange={() => setDeliveryMethod("shipping")}
          />

          <div>
            <div className="font-semibold">Ship to my address</div>
            <div className="text-sm text-slate-500">
              Shipping calculated after your address is entered.
            </div>
          </div>
        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-4 hover:border-yellow-400">
          <input
            type="radio"
            checked={deliveryMethod === "pickup"}
            onChange={() => setDeliveryMethod("pickup")}
          />

          <div>
            <div className="font-semibold">Local Pickup</div>
            <div className="text-sm text-slate-500">
              Approximate pickup area: {PICKUP_AREA}
            </div>
          </div>
        </label>
      </div>

      {deliveryMethod === "pickup" && (
        <section
          className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
          aria-labelledby="pickup-area-map-heading"
        >
          <div className="p-4">
            <h3
              id="pickup-area-map-heading"
              className="font-semibold text-slate-950"
            >
              Approximate pickup area on Google Maps
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              This map shows the nearby intersection only. We&apos;ll email the
              exact home-based pickup address and instructions when your order is
              ready.
            </p>
          </div>

          <iframe
            src={PICKUP_MAP_EMBED_URL}
            title="Google map showing the approximate Layer Forge pickup area near 128 Street and 66 Avenue in Surrey"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            className="h-64 w-full border-0"
          />

          <div className="border-t border-slate-200 bg-white p-4">
            <a
              href={PICKUP_MAP_URL}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-slate-950 underline decoration-yellow-500 decoration-2 underline-offset-4 hover:text-yellow-700"
            >
              Open approximate area in Google Maps
              <span aria-hidden="true"> ↗</span>
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
