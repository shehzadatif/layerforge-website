import { SITE } from "../config/site";

function formatNumber(
  prefix: string,
  number: number,
  digits = 6
) {
  return `${prefix}${String(number).padStart(digits, "0")}`;
}

export function formatOrderNumber(orderNumber: number) {
  return formatNumber(
    SITE.orderPrefix,
    orderNumber
  );
}

export function formatQuoteNumber(quoteNumber: number) {
  return formatNumber(
    SITE.quotePrefix,
    quoteNumber
  );
}

export function formatInvoiceNumber(invoiceNumber: number) {
  return formatNumber(
    SITE.invoicePrefix,
    invoiceNumber
  );
}

export function formatPackingSlipNumber(
  packingSlipNumber: number
) {
  return formatNumber(
    SITE.packingSlipPrefix,
    packingSlipNumber
  );
}