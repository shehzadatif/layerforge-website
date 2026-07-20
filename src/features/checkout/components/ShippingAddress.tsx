import type { CheckoutForm } from "../types";

interface Props {
  form: CheckoutForm;
  errors: Record<string, string>;
  updateField: (field: keyof CheckoutForm, value: string) => void;
}

export default function ShippingAddress({ form, errors, updateField }: Props) {
  return (
    <div className="rounded-2xl bg-white p-8 shadow">
      <h2 className="mb-6 text-2xl font-bold">Shipping Address</h2>

      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">
        Shipping is currently available to Canadian addresses only. Please enter
        your delivery address below.
      </div>

      <div className="grid gap-5">
        <div>
          <label
            htmlFor="shipping-address"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Street address
          </label>
          <input
            id="shipping-address"
            value={form.address}
            onChange={(event) => updateField("address", event.target.value)}
            placeholder="123 Main Street"
            autoComplete="off"
            className={`w-full rounded-xl border p-4 ${
              errors.address ? "border-red-500" : ""
            }`}
          />

          {errors.address && (
            <p className="mt-1 text-sm text-red-600">{errors.address}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="shipping-unit"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Apartment or unit <span className="font-normal">(optional)</span>
          </label>
          <input
            id="shipping-unit"
            value={form.unit}
            onChange={(event) => updateField("unit", event.target.value)}
            placeholder="Apartment or unit"
            autoComplete="off"
            className="w-full rounded-xl border p-4"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="shipping-city"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              City
            </label>
            <input
              id="shipping-city"
              value={form.city}
              onChange={(event) => updateField("city", event.target.value)}
              placeholder="City"
              autoComplete="off"
              className={`w-full rounded-xl border p-4 ${
                errors.city ? "border-red-500" : ""
              }`}
            />

            {errors.city && (
              <p className="mt-1 text-sm text-red-600">{errors.city}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="shipping-postal-code"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Postal code
            </label>
            <input
              id="shipping-postal-code"
              inputMode="text"
              value={form.postalCode}
              onChange={(event) =>
                updateField("postalCode", event.target.value)
              }
              placeholder="A1A 1A1"
              autoComplete="off"
              className={`w-full rounded-xl border p-4 uppercase ${
                errors.postalCode ? "border-red-500" : ""
              }`}
            />

            {errors.postalCode && (
              <p className="mt-1 text-sm text-red-600">{errors.postalCode}</p>
            )}
          </div>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">
            Province or territory
          </span>
          <select
            id="shipping-province"
            value={form.province}
            onChange={(event) => updateField("province", event.target.value)}
            autoComplete="off"
            className="rounded-xl border p-4"
          >
            <option value="BC">British Columbia</option>
            <option value="AB">Alberta</option>
            <option value="SK">Saskatchewan</option>
            <option value="MB">Manitoba</option>
            <option value="ON">Ontario</option>
            <option value="QC">Quebec</option>
            <option value="NB">New Brunswick</option>
            <option value="NS">Nova Scotia</option>
            <option value="PE">Prince Edward Island</option>
            <option value="NL">Newfoundland &amp; Labrador</option>
            <option value="YT">Yukon</option>
            <option value="NT">Northwest Territories</option>
            <option value="NU">Nunavut</option>
          </select>
          <span className="text-sm text-slate-500">
            Your shipping rate updates from this selection.
          </span>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Country</span>
          <input
            value="Canada"
            readOnly
            autoComplete="off"
            className="rounded-xl border bg-slate-100 p-4 text-slate-600"
          />
        </label>
      </div>
    </div>
  );
}
