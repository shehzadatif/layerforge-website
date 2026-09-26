import type Stripe from "stripe";

export interface PaidSessionAmounts {
  subtotal: number;
  shipping: number;
  gstRate: number;
  gstAmount: number;
  pstRate: number;
  pstAmount: number;
  tax: number;
  total: number;
}

function centsFromMetadata(
  metadata: Stripe.Metadata | null,
  key: string,
): number | null {
  const value = Number(metadata?.[key]);

  return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

function rateFromMetadata(
  metadata: Stripe.Metadata | null,
  key: string,
): number {
  const value = Number(metadata?.[key]);

  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function taxBreakdown(session: Stripe.Checkout.Session) {
  let gstRate = 0;
  let gstAmountCents = 0;
  let pstRate = 0;
  let pstAmountCents = 0;

  for (const tax of session.total_details?.breakdown?.taxes ?? []) {
    const displayName = String(tax.rate?.display_name ?? "").toUpperCase();
    const percentage = Number(tax.rate?.percentage ?? 0);

    if (displayName.includes("GST")) {
      gstRate = Number.isFinite(percentage) ? percentage : 0;
      gstAmountCents += Number(tax.amount ?? 0);
    } else if (displayName.includes("PST")) {
      pstRate = Number.isFinite(percentage) ? percentage : 0;
      pstAmountCents += Number(tax.amount ?? 0);
    }
  }

  return {
    gstRate,
    gstAmountCents,
    pstRate,
    pstAmountCents,
  };
}

export function getPaidSessionAmounts(
  session: Stripe.Checkout.Session,
): PaidSessionAmounts {
  const metadata = session.metadata;
  const manualTax = metadata?.taxCalculationVersion === "admin-config-v1";
  const stripeTaxes = taxBreakdown(session);

  if (manualTax) {
    const subtotalCents = centsFromMetadata(
      metadata,
      "merchandiseSubtotalCents",
    );
    const shippingCents = centsFromMetadata(metadata, "shippingCents");
    const expectedGstAmountCents = centsFromMetadata(
      metadata,
      "gstAmountCents",
    );
    const expectedPstAmountCents = centsFromMetadata(
      metadata,
      "pstAmountCents",
    );

    if (
      subtotalCents == null ||
      shippingCents == null ||
      expectedGstAmountCents == null ||
      expectedPstAmountCents == null
    ) {
      throw new Error("Checkout tax metadata is incomplete.");
    }

    const hasStripeTaxBreakdown =
      stripeTaxes.gstAmountCents > 0 || stripeTaxes.pstAmountCents > 0;
    const gstAmountCents = hasStripeTaxBreakdown
      ? stripeTaxes.gstAmountCents
      : expectedGstAmountCents;
    const pstAmountCents = hasStripeTaxBreakdown
      ? stripeTaxes.pstAmountCents
      : expectedPstAmountCents;
    const gstRate =
      stripeTaxes.gstRate || rateFromMetadata(metadata, "gstRate");
    const pstRate =
      stripeTaxes.pstRate || rateFromMetadata(metadata, "pstRate");
    const taxCents = gstAmountCents + pstAmountCents;

    return {
      subtotal: subtotalCents / 100,
      shipping: shippingCents / 100,
      gstRate,
      gstAmount: gstAmountCents / 100,
      pstRate,
      pstAmount: pstAmountCents / 100,
      tax: taxCents / 100,
      total: Number(session.amount_total ?? 0) / 100,
    };
  }

  const shippingCost = session.shipping_cost;
  const shippingSubtotalCents = Number(
    shippingCost?.amount_subtotal ??
      Math.max(
        0,
        Number(shippingCost?.amount_total ?? 0) -
          Number(shippingCost?.amount_tax ?? 0),
      ),
  );

  return {
    subtotal: Number(session.amount_subtotal ?? 0) / 100,
    shipping: shippingSubtotalCents / 100,
    gstRate: stripeTaxes.gstRate,
    gstAmount: stripeTaxes.gstAmountCents / 100,
    pstRate: stripeTaxes.pstRate,
    pstAmount: stripeTaxes.pstAmountCents / 100,
    tax: Number(session.total_details?.amount_tax ?? 0) / 100,
    total: Number(session.amount_total ?? 0) / 100,
  };
}
