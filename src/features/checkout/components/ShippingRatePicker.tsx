import { useEffect, useRef, useState } from "react";

import type { ShippingRate } from "../../../lib/stallion";
import type { CheckoutForm } from "../types";

interface Props {
  customer: CheckoutForm;
  items: Array<{ quantity: number }>;
  selectedRate: ShippingRate | null;
  onSelect: (rate: ShippingRate | null) => void;
}

export default function ShippingRatePicker({
  customer,
  items,
  selectedRate,
  onSelect,
}: Props) {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [packingNotice, setPackingNotice] = useState("");
  const itemsSignature = items.map((item) => item.quantity).join("|");
  const previousItemsSignature = useRef(itemsSignature);
  const requestSequence = useRef(0);

  async function loadRates(
    preferredService?: string,
    requestId = ++requestSequence.current,
  ) {
    if (
      !customer.address.trim() ||
      !customer.city.trim() ||
      !customer.postalCode.trim()
    ) {
      setError("Enter your full shipping address first.");
      return;
    }

    setIsLoading(true);
    setError("");
    setPackingNotice("");
    setRates([]);

    try {
      const response = await fetch("/api/shipping-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer, items }),
      });
      const data = (await response.json()) as {
        rates?: ShippingRate[];
        error?: string;
        packageCount?: number;
        packageType?:
          "poly-mailer" | "apparel-carton" | "standard-box" | "mixed";
        bulkReviewRecommended?: boolean;
      };

      if (!response.ok || !Array.isArray(data.rates)) {
        throw new Error(data.error || "Unable to load shipping rates.");
      }
      if (requestId !== requestSequence.current) return;

      setRates(data.rates);
      if (data.packageType === "poly-mailer") {
        setPackingNotice(
          "Packed in a slim apparel mailer for a lower shipping rate.",
        );
      } else if (data.packageType === "apparel-carton") {
        const count = Math.max(1, Number(data.packageCount ?? 1));
        setPackingNotice(
          data.bulkReviewRecommended
            ? `Bulk apparel shipment estimated as ${count} cartons. We will verify the final carton count and measurements before purchasing the labels.`
            : `Apparel shipment estimated as ${count} ${count === 1 ? "carton" : "cartons"}.`,
        );
      } else if (data.packageType === "mixed") {
        const count = Math.max(2, Number(data.packageCount ?? 2));
        setPackingNotice(
          `Mixed order estimated as ${count} parcels: apparel is packed separately from rigid products, and the rate includes every parcel.`,
        );
      }

      const preferredRate = preferredService
        ? data.rates.find((rate) => rate.service === preferredService)
        : null;

      if (preferredRate) {
        onSelect(preferredRate);
      } else if (data.rates.length === 1) {
        onSelect(data.rates[0]);
      }
    } catch (loadError) {
      if (requestId !== requestSequence.current) return;
      setRates([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load shipping rates.",
      );
    } finally {
      if (requestId === requestSequence.current) setIsLoading(false);
    }
  }

  useEffect(() => {
    if (previousItemsSignature.current === itemsSignature) return;

    previousItemsSignature.current = itemsSignature;
    if (rates.length === 0 && !selectedRate) return;

    const preferredService = selectedRate?.service;
    onSelect(null);
    setRates([]);
    setError("");
    setIsLoading(true);
    const requestId = ++requestSequence.current;
    const timeout = window.setTimeout(() => {
      void loadRates(preferredService, requestId);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [itemsSignature]);

  return (
    <section className="rounded-2xl bg-white p-8 shadow">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Shipping Service</h2>
          <p className="mt-1 text-sm text-slate-500">
            Live Canadian shipping rates powered by Stallion.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadRates()}
          disabled={isLoading}
          className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
        >
          {isLoading ? "Loading rates…" : "Get shipping rates"}
        </button>
      </div>

      {error ? (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {packingNotice ? (
        <p className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {packingNotice}
        </p>
      ) : null}

      {rates.length > 0 ? (
        <div className="mt-6 space-y-3">
          {rates.map((rate) => (
            <label
              key={rate.service}
              className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border-2 p-4 transition ${
                selectedRate?.service === rate.service
                  ? "border-yellow-400 bg-yellow-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="shipping-rate"
                  checked={selectedRate?.service === rate.service}
                  onChange={() => onSelect(rate)}
                  className="h-5 w-5 accent-yellow-500"
                />
                <span>
                  <strong className="block text-slate-950">
                    {rate.serviceName}
                  </strong>
                  <span className="text-sm text-slate-500">
                    {rate.carrier}
                    {rate.estimatedDays != null
                      ? ` · about ${rate.estimatedDays} business days`
                      : ""}
                  </span>
                </span>
              </span>
              <strong className="whitespace-nowrap">
                CAD ${(rate.amountCents / 100).toFixed(2)}
              </strong>
            </label>
          ))}
        </div>
      ) : null}
    </section>
  );
}
