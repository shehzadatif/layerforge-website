import type { CheckoutForm } from "../types";

interface Props {
  form: CheckoutForm;
  errors: Record<string, string>;
  updateField: (field: keyof CheckoutForm, value: string) => void;
}

export default function ContactForm({ form, errors, updateField }: Props) {
  return (
    <div className="rounded-2xl bg-white p-8 shadow">
      <h2 className="mb-6 text-2xl font-bold">Contact Information</h2>

      <div className="grid gap-5">
        <div>
          <input
            id="checkout-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="Email"
            className={`w-full rounded-xl border p-4 ${
              errors.email ? "border-red-500" : ""
            }`}
          />

          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <input
              id="checkout-first-name"
              name="given-name"
              autoComplete="given-name"
              value={form.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              placeholder="First Name"
              className={`w-full rounded-xl border p-4 ${
                errors.firstName ? "border-red-500" : ""
              }`}
            />

            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
            )}
          </div>

          <div>
            <input
              id="checkout-last-name"
              name="family-name"
              autoComplete="family-name"
              value={form.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              placeholder="Last Name"
              className={`w-full rounded-xl border p-4 ${
                errors.lastName ? "border-red-500" : ""
              }`}
            />

            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div>
          <input
            id="checkout-phone"
            name="tel"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="Phone Number"
            className={`w-full rounded-xl border p-4 ${
              errors.phone ? "border-red-500" : ""
            }`}
          />

          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
          )}
        </div>
      </div>
    </div>
  );
}
