export type Province =
  | "BC"
  | "AB"
  | "SK"
  | "MB"
  | "ON"
  | "QC"
  | "NB"
  | "NS"
  | "PE"
  | "NL"
  | "YT"
  | "NT"
  | "NU";

export const SHIPPING_RATES: Record<Province, number> = {
  BC: 15,
  AB: 18,
  SK: 18,
  MB: 20,
  ON: 22,
  QC: 22,
  NB: 25,
  NS: 25,
  PE: 25,
  NL: 25,
  YT: 35,
  NT: 35,
  NU: 35,
};

export function getShippingCost(
  deliveryMethod: "shipping" | "pickup",
  province: Province
) {
  if (deliveryMethod === "pickup") {
    return 0;
  }

  return SHIPPING_RATES[province];
}