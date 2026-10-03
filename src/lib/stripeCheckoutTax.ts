import type Stripe from "stripe";

export const LOCAL_PICKUP_TAX_ADDRESS: Stripe.AddressParam = {
  city: "Surrey",
  state: "BC",
  country: "CA",
};

export function isLocalPickupCheckout(
  params: Stripe.Checkout.SessionCreateParams,
) {
  return (params.shipping_options ?? []).some((option) => {
    const rateData =
      "shipping_rate_data" in option ? option.shipping_rate_data : undefined;

    return rateData?.display_name?.trim().toLowerCase() === "local pickup";
  });
}

export function attachCheckoutCustomer(
  params: Stripe.Checkout.SessionCreateParams,
  customerId: string,
): Stripe.Checkout.SessionCreateParams {
  const { customer_email: _customerEmail, ...remainingParams } = params;

  return {
    ...remainingParams,
    customer: customerId,
  };
}
