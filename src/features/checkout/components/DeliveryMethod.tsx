import type { DeliveryMethod as DeliveryMethodType } from "../types";

interface Props {
  deliveryMethod: DeliveryMethodType;
  setDeliveryMethod: (
    method: DeliveryMethodType
  ) => void;
}

export default function DeliveryMethod({
  deliveryMethod,
  setDeliveryMethod,
}: Props) {
  return (
    <div className="rounded-2xl bg-white p-8 shadow">

      <h2 className="mb-6 text-2xl font-bold">
        Delivery Method
      </h2>

      <div className="space-y-4">

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-4 hover:border-yellow-400">

          <input
            type="radio"
            checked={deliveryMethod === "shipping"}
            onChange={() =>
              setDeliveryMethod("shipping")
            }
          />

          <div>

            <div className="font-semibold">
              Ship to my address
            </div>

            <div className="text-sm text-slate-500">
              Shipping calculated after your address is entered.
            </div>

          </div>

        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-4 hover:border-yellow-400">

          <input
            type="radio"
            checked={deliveryMethod === "pickup"}
            onChange={() =>
              setDeliveryMethod("pickup")
            }
          />

          <div>

            <div className="font-semibold">
              Local Pickup
            </div>

            <div className="text-sm text-slate-500">
              Surrey, British Columbia
            </div>

          </div>

        </label>

      </div>

    </div>
  );
}