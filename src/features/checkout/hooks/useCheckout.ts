import { useState } from "react";
import type { CheckoutForm } from "../types";

export function useCheckout() {
  const [form, setForm] = useState<CheckoutForm>({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    unit: "",
    city: "",
    postalCode: "",
    province: "BC",
    deliveryMethod: "shipping",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof CheckoutForm>(field: K, value: CheckoutForm[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validate() {
    const next: Record<string,string> = {};

    if (!form.email.trim()) next.email = "Email is required.";
    if (!form.firstName.trim()) next.firstName = "First name is required.";
    if (!form.lastName.trim()) next.lastName = "Last name is required.";
    if (!form.phone.trim()) next.phone = "Phone number is required.";

    if (form.deliveryMethod === "shipping") {
      if (!form.address.trim()) next.address = "Street address is required.";
      if (!form.city.trim()) next.city = "City is required.";
      if (!form.postalCode.trim()) next.postalCode = "Postal code is required.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  return {
    form,
    errors,
    isSubmitting,
    setIsSubmitting,
    updateField,
    validate,
  };
}
