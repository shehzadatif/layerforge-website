export function normalizeDeliveryMethod(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function isPickupDeliveryMethod(value: unknown) {
  const normalized = normalizeDeliveryMethod(value);

  return (
    normalized === "pickup" ||
    normalized === "pick up" ||
    normalized === "local pickup" ||
    normalized === "local pick up"
  );
}
