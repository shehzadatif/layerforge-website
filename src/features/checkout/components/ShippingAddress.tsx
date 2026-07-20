import type { CheckoutForm } from "../types";
import type { Province } from "../../../lib/taxes";

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
        Shipping is currently available to Canadian addresses only. Select a
        saved address from your browser to fill these fields automatically.
      </div>

      <div className="grid gap-5">
        <div>
          <input
            id="shipping-address"
            name="shipping-address-line1"
            autoComplete="shipping address-line1"
            value={form.address}
            onChange={(e) => updateField("address", e.target.value)}
            placeholder="Street Address"
            className={`w-full rounded-xl border p-4 ${
              errors.address ? "border-red-500" : ""
            }`}
          />

          {errors.address && (
            <p className="mt-1 text-sm text-red-600">{errors.address}</p>
          )}
        </div>

        <input
          id="shipping-unit"
          name="shipping-address-line2"
          autoComplete="shipping address-line2"
          value={form.unit}
          onChange={(e) => updateField("unit", e.target.value)}
          placeholder="Apartment / Unit"
          className="rounded-xl border p-4"
        />

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <input
              id="shipping-city"
              name="shipping-city"
              autoComplete="shipping address-level2"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder="City"
              className={`w-full rounded-xl border p-4 ${
                errors.city ? "border-red-500" : ""
              }`}
            />

            {errors.city && (
              <p className="mt-1 text-sm text-red-600">{errors.city}</p>
            )}
          </div>

          <div>
            <input
              id="shipping-postal-code"
              name="shipping-postal-code"
              autoComplete="shipping postal-code"
              inputMode="text"
              value={form.postalCode}
              onChange={(e) => updateField("postalCode", e.target.value)}
              placeholder="Postal Code"
              className={`w-full rounded-xl border p-4 ${
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
            name="shipping-province"
            autoComplete="shipping address-level1"
            value={form.province}
            onChange={(e) =>
              updateField("province", e.target.value as Province)
            }
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
            <option value="NL">Newfoundland & Labrador</option>
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
            name="shipping-country"
            autoComplete="shipping country-name"
            value="Canada"
            readOnly
            className="rounded-xl border bg-slate-100 p-4 text-slate-600"
          />
        </label>
      </div>
    </div>
  );
}
